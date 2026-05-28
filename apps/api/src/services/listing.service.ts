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

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

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
      where.OR = [
        { title: { contains: input.q, mode: "insensitive" } },
        { description: { contains: input.q, mode: "insensitive" } },
        { tags: { has: input.q.toLowerCase() } },
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

    await prisma.listing.update({
      where: { id: listing.id },
      data: { viewCount: { increment: 1 } },
    });

    return listing;
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
};
