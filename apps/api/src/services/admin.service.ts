import {
  JobStatus,
  ListingStatus,
  ModerationDecision,
  UserRole,
  UserStatus,
  prisma,
} from "@stride/database";
import { enqueueEmail } from "./queue.service.js";

export const adminService = {
  async dashboard() {
    const [
      pendingListings,
      flaggedListings,
      activeListings,
      openReports,
      users,
      sellers,
      failedJobs,
      activeBanners,
    ] = await Promise.all([
      prisma.listing.count({ where: { moderation: ModerationDecision.PENDING } }),
      prisma.listing.count({ where: { moderation: ModerationDecision.FLAGGED } }),
      prisma.listing.count({ where: { status: ListingStatus.ACTIVE } }),
      prisma.report.count({ where: { resolved: false } }),
      prisma.user.count(),
      prisma.user.count({ where: { role: UserRole.SELLER } }),
      prisma.backgroundJob.count({ where: { status: JobStatus.FAILED } }),
      prisma.homepageBanner.count({ where: { active: true } }),
    ]);

    const recentListings = await prisma.listing.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        seller: { select: { id: true, name: true, email: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    });

    return {
      counts: {
        pendingListings,
        flaggedListings,
        activeListings,
        openReports,
        users,
        sellers,
        failedJobs,
        activeBanners,
      },
      recentListings,
    };
  },

  moderationQueue() {
    return prisma.listing.findMany({
      where: {
        OR: [
          { moderation: ModerationDecision.PENDING },
          { moderation: ModerationDecision.FLAGGED },
          { status: ListingStatus.PENDING_REVIEW },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        category: true,
        seller: { select: { id: true, name: true, email: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        moderationLogs: { orderBy: { createdAt: "desc" }, take: 3 },
      },
    });
  },

  listings() {
    return prisma.listing.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        seller: { select: { id: true, name: true, email: true } },
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
      },
    });
  },

  async approveListing(adminId: string, listingId: string) {
    const listing = await prisma.listing.update({
      where: { id: listingId },
      data: {
        status: ListingStatus.ACTIVE,
        moderation: ModerationDecision.APPROVED,
        moderationNote: null,
        publishedAt: new Date(),
        moderationLogs: {
          create: {
            source: "admin",
            decision: ModerationDecision.APPROVED,
            reason: `Approved by admin ${adminId}`,
          },
        },
      },
      include: { seller: true },
    });

    await enqueueEmail({
      to: listing.seller.email,
      subject: "Your listing was approved",
      type: "LISTING_APPROVED",
      htmlBody: `<p>${listing.title} is now live on StrideMarket.</p>`,
    });

    return listing;
  },

  async rejectListing(adminId: string, listingId: string, note: string) {
    const listing = await prisma.listing.update({
      where: { id: listingId },
      data: {
        status: ListingStatus.REJECTED,
        moderation: ModerationDecision.REJECTED,
        moderationNote: note,
        moderationLogs: {
          create: {
            source: "admin",
            decision: ModerationDecision.REJECTED,
            reason: `Rejected by admin ${adminId}: ${note}`,
          },
        },
      },
      include: { seller: true },
    });

    await enqueueEmail({
      to: listing.seller.email,
      subject: "Your listing needs changes",
      type: "LISTING_REJECTED",
      htmlBody: `<p>${listing.title} was rejected.</p><p>${note}</p>`,
    });

    return listing;
  },

  setListingFeatured(listingId: string, featured: boolean) {
    return prisma.listing.update({
      where: { id: listingId },
      data: { featured },
    });
  },

  users() {
    return prisma.user.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: { sellerProfile: true },
    });
  },

  async promoteUser(userId: string, role: "SELLER" | "ADMIN") {
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true },
    });

    return prisma.user.update({
      where: { id: userId },
      data: {
        role,
        ...(role === UserRole.SELLER
          ? {
              sellerProfile: {
                upsert: {
                  create: { displayName: user.name, moderationNote: "Created by admin" },
                  update: {},
                },
              },
            }
          : {}),
      },
    });
  },

  setUserStatus(userId: string, status: UserStatus) {
    return prisma.user.update({
      where: { id: userId },
      data: { status },
    });
  },

  banners() {
    return prisma.homepageBanner.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });
  },

  createBanner(input: {
    title: string;
    subtitle?: string;
    imageUrl: string;
    linkUrl?: string;
    sortOrder: number;
    active: boolean;
  }) {
    return prisma.homepageBanner.create({ data: input });
  },

  updateBanner(
    id: string,
    input: Partial<{
      title: string;
      subtitle: string | null;
      imageUrl: string;
      linkUrl: string | null;
      sortOrder: number;
      active: boolean;
    }>
  ) {
    return prisma.homepageBanner.update({ where: { id }, data: input });
  },

  reports() {
    return prisma.report.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        listing: {
          include: {
            seller: { select: { id: true, name: true, email: true } },
            category: true,
          },
        },
      },
    });
  },

  resolveReport(id: string, resolved: boolean) {
    return prisma.report.update({ where: { id }, data: { resolved } });
  },

  jobs() {
    return prisma.backgroundJob.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
    });
  },
};
