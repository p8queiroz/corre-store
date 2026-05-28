import { listingService } from "../services/listing.service.js";
import type { ApiContext } from "../context.js";

export const resolvers = {
  Query: {
    health: () => "ok",
    categories: (_: unknown, __: unknown, ctx: ApiContext) =>
      ctx.prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    listing: (_: unknown, { slug }: { slug: string }) =>
      listingService.getBySlug(slug),
    searchListings: (_: unknown, args: Record<string, unknown>) =>
      listingService.search(args),
    featuredListings: (
      _: unknown,
      { limit }: { limit?: number }
    ) => listingService.getFeatured(limit ?? 8),
    trendingListings: (
      _: unknown,
      { limit }: { limit?: number }
    ) => listingService.getTrending(limit ?? 12),
    homepageBanners: (_: unknown, __: unknown, ctx: ApiContext) =>
      ctx.prisma.homepageBanner.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      }),
  },
};
