import { prisma, ListingStatus, ModerationDecision } from "@stride/database";
import {
  createListingSchema,
  searchListingsSchema,
  type CreateListingInput,
  type UpdateListingInput,
  updateListingSchema,
} from "@stride/shared";
import { AppError } from "../middleware/error-handler.js";
import { enqueueJob } from "./queue.service.js";
import { JOB_QUEUES } from "@stride/shared";
import { categorySlugsForQuery, searchTerms } from "./search-intent.service.js";
import { cosineSimilarity } from "../lib/vector.js";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

const publicListingCardInclude = {
  images: { orderBy: { sortOrder: "asc" as const }, take: 1 },
  category: true,
  seller: { select: { id: true, name: true, avatarUrl: true } },
};

export const listingService = {
  async search(raw: unknown) {
    const input = searchListingsSchema.parse(raw);
    const where: Record<string, unknown> = {
      status: ListingStatus.ACTIVE,
      moderation: ModerationDecision.APPROVED,
    };

    if (input.categorySlug) {
      where.category = { slug: input.categorySlug };
    }
    if (input.city) where.city = { equals: input.city, mode: "insensitive" };
    if (input.state) where.state = { equals: input.state, mode: "insensitive" };
    if (input.condition) where.condition = input.condition;
    if (input.minPriceCents || input.maxPriceCents) {
      where.priceCents = {
        ...(input.minPriceCents ? { gte: input.minPriceCents } : {}),
        ...(input.maxPriceCents ? { lte: input.maxPriceCents } : {}),
      };
    }
    if (input.q) {
      const terms = searchTerms(input.q);
      const categorySlugs = categorySlugsForQuery(input.q);
      where.OR = [
        ...terms.flatMap((term) => [
          { title: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
          { category: { name: { contains: term, mode: "insensitive" } } },
          { category: { description: { contains: term, mode: "insensitive" } } },
        ]),
        { tags: { hasSome: terms.map((term) => term.toLowerCase()) } },
        ...(categorySlugs.length
          ? [{ category: { slug: { in: categorySlugs } } }]
          : []),
      ];
    }

    const orderBy =
      input.sort === "price_asc"
        ? { priceCents: "asc" as const }
        : input.sort === "price_desc"
          ? { priceCents: "desc" as const }
          : input.sort === "trending"
            ? { trendingScore: "desc" as const }
            : { publishedAt: "desc" as const };

    const skip = (input.page - 1) * input.limit;

    const [items, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        orderBy,
        skip,
        take: input.limit,
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          category: true,
          seller: { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
      prisma.listing.count({ where }),
    ]);

    return { items, total, page: input.page, limit: input.limit };
  },

  async getBySlug(slug: string) {
    const listing = await prisma.listing.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: true,
        seller: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            sellerProfile: true,
          },
        },
      },
    });

    if (!listing) {
      throw new AppError(404, "Listing not found", "NOT_FOUND");
    }
    if (
      listing.status !== ListingStatus.ACTIVE ||
      listing.moderation !== ModerationDecision.APPROVED
    ) {
      throw new AppError(404, "Listing not found", "NOT_FOUND");
    }

    await prisma.listing.update({
      where: { id: listing.id },
      data: { viewCount: { increment: 1 } },
    });

    return listing;
  },

  /**
   * Rank related ACTIVE listings by cosine similarity on Listing.embedding.
   * Falls back to same-category recency when embeddings are missing
   * (e.g. OpenAI key unset or embedding job still pending).
   */
  async findSimilar(slug: string, limit = 4) {
    const capped = Math.min(Math.max(limit, 1), 12);
    const source = await prisma.listing.findUnique({
      where: { slug },
      select: { id: true, embedding: true, categoryId: true },
    });
    if (!source) return [];

    const activeWhere = {
      status: ListingStatus.ACTIVE,
      moderation: ModerationDecision.APPROVED,
      id: { not: source.id },
    };

    const sameCategory = await prisma.listing.findMany({
      where: { ...activeWhere, categoryId: source.categoryId },
      take: 64,
      include: publicListingCardInclude,
      orderBy: { publishedAt: "desc" },
    });

    let pool = sameCategory;
    if (pool.length < capped * 3) {
      const extra = await prisma.listing.findMany({
        where: {
          ...activeWhere,
          id: { notIn: [source.id, ...pool.map((item) => item.id)] },
        },
        take: 64,
        include: publicListingCardInclude,
        orderBy: { publishedAt: "desc" },
      });
      pool = [...pool, ...extra];
    }

    if (source.embedding.length > 0) {
      const ranked = pool
        .filter((item) => item.embedding.length === source.embedding.length)
        .map((listing) => ({
          listing,
          score: cosineSimilarity(source.embedding, listing.embedding),
        }))
        .filter((row) => Number.isFinite(row.score) && row.score > 0.15)
        .sort((a, b) => b.score - a.score)
        .slice(0, capped)
        .map((row) => row.listing);

      if (ranked.length) return ranked;
    }

    return sameCategory.slice(0, capped);
  },

  async create(sellerId: string, raw: CreateListingInput) {
    const data = createListingSchema.parse(raw);
    const { imageUrls, ...listingData } = data;
    let slug = slugify(data.title);
    const exists = await prisma.listing.findUnique({ where: { slug } });
    if (exists) slug = `${slug}-${Date.now()}`;

    const sellerProfile = await prisma.sellerProfile.findUnique({
      where: { userId: sellerId },
    });

    const listing = await prisma.listing.create({
      data: {
        ...listingData,
        slug,
        sellerId,
        sellerProfileId: sellerProfile?.id,
        status: ListingStatus.PENDING_REVIEW,
        moderation: ModerationDecision.PENDING,
        images: imageUrls.length
          ? {
              create: imageUrls.map((url, sortOrder) => ({
                url,
                sortOrder,
              })),
            }
          : undefined,
      },
    });

    await enqueueJob(JOB_QUEUES.AI_MODERATION, { listingId: listing.id });
    await enqueueJob(JOB_QUEUES.AI_EMBEDDING, { listingId: listing.id });

    return listing;
  },

  async listMine(userId: string, role: string) {
    return prisma.listing.findMany({
      where: role === "ADMIN" ? {} : { sellerId: userId },
      take: 100,
      orderBy: { updatedAt: "desc" },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: true,
      },
    });
  },

  async setMineStatus(
    userId: string,
    role: string,
    listingId: string,
    status: ListingStatus
  ) {
    const existing = await this.getMine(userId, role, listingId);
    if (status === ListingStatus.ACTIVE && existing.moderation !== ModerationDecision.APPROVED) {
      throw new AppError(400, "Only approved listings can be reactivated", "NOT_APPROVED");
    }

    return prisma.listing.update({
      where: { id: existing.id },
      data: {
        status,
        soldAt: status === ListingStatus.SOLD ? new Date() : null,
        publishedAt:
          status === ListingStatus.ACTIVE && !existing.publishedAt
            ? new Date()
            : existing.publishedAt,
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: true,
      },
    });
  },

  async duplicateMine(userId: string, role: string, listingId: string) {
    const existing = await this.getMine(userId, role, listingId);
    const slug = `${slugify(existing.title)}-${Date.now()}`;

    return prisma.listing.create({
      data: {
        sellerId: existing.sellerId,
        sellerProfileId: existing.sellerProfileId,
        categoryId: existing.categoryId,
        title: `${existing.title} (copy)`,
        slug,
        description: existing.description,
        priceCents: existing.priceCents,
        condition: existing.condition,
        city: existing.city,
        state: existing.state,
        tags: existing.tags,
        status: ListingStatus.DRAFT,
        moderation: ModerationDecision.PENDING,
        images: {
          create: existing.images.map((image, sortOrder) => ({
            url: image.url,
            thumbnailUrl: image.thumbnailUrl,
            altText: image.altText,
            sortOrder,
          })),
        },
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: true,
      },
    });
  },

  async getMine(userId: string, role: string, listingId: string) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: true,
      },
    });

    if (!listing) {
      throw new AppError(404, "Listing not found", "NOT_FOUND");
    }
    if (role !== "ADMIN" && listing.sellerId !== userId) {
      throw new AppError(403, "You can only manage your own listings", "FORBIDDEN");
    }

    return listing;
  },

  async updateMine(
    userId: string,
    role: string,
    listingId: string,
    raw: UpdateListingInput
  ) {
    const existing = await this.getMine(userId, role, listingId);
    const data = updateListingSchema.parse(raw);
    const { imageUrls, ...listingData } = data;

    const updated = await prisma.listing.update({
      where: { id: existing.id },
      data: {
        ...listingData,
        status: ListingStatus.PENDING_REVIEW,
        moderation: ModerationDecision.PENDING,
        moderationNote: null,
        publishedAt: null,
        ...(imageUrls
          ? {
              images: {
                deleteMany: {},
                create: imageUrls.map((url, sortOrder) => ({ url, sortOrder })),
              },
            }
          : {}),
      },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        category: true,
      },
    });

    await enqueueJob(JOB_QUEUES.AI_MODERATION, { listingId: updated.id });
    await enqueueJob(JOB_QUEUES.AI_EMBEDDING, { listingId: updated.id });

    return updated;
  },

  async getFeatured(limit = 8) {
    return prisma.listing.findMany({
      where: {
        featured: true,
        status: ListingStatus.ACTIVE,
        moderation: ModerationDecision.APPROVED,
      },
      take: limit,
      orderBy: { trendingScore: "desc" },
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        category: true,
      },
    });
  },

  async getTrending(limit = 12) {
    return prisma.listing.findMany({
      where: {
        status: ListingStatus.ACTIVE,
        moderation: ModerationDecision.APPROVED,
      },
      take: limit,
      orderBy: { trendingScore: "desc" },
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        category: true,
      },
    });
  },

  async getPublicSeller(userId: string) {
    const seller = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        city: true,
        state: true,
        bio: true,
        instagramUrl: true,
        stravaUrl: true,
        websiteUrl: true,
        createdAt: true,
        whatsappConfirmedAt: true,
        sellerProfile: true,
      },
    });

    if (!seller?.sellerProfile) {
      throw new AppError(404, "Seller not found", "NOT_FOUND");
    }

    const [approvedListings, activeListings, listings] = await Promise.all([
      prisma.listing.count({
        where: { sellerId: userId, moderation: ModerationDecision.APPROVED },
      }),
      prisma.listing.count({
        where: {
          sellerId: userId,
          status: ListingStatus.ACTIVE,
          moderation: ModerationDecision.APPROVED,
        },
      }),
      prisma.listing.findMany({
        where: {
          sellerId: userId,
          status: ListingStatus.ACTIVE,
          moderation: ModerationDecision.APPROVED,
        },
        take: 24,
        orderBy: { publishedAt: "desc" },
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          category: true,
        },
      }),
    ]);

    return {
      seller,
      trust: {
        joinedAt: seller.createdAt,
        approvedListings,
        activeListings,
        whatsappConfirmed: Boolean(seller.whatsappConfirmedAt),
        profileVerified: seller.sellerProfile.isVerified,
      },
      listings,
    };
  },
};
