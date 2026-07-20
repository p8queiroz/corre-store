import type { ApiContext } from "../context.js";
import { createTrpcCaller } from "../trpc/caller.js";

/**
 * GraphQL resolvers — public read orchestration.
 * Listing domain calls go through tRPC createCaller (in-process),
 * so GraphQL composes procedures instead of importing services directly.
 */
export const resolvers = {
  Query: {
    health: () => "ok",

    categories: (_: unknown, __: unknown, ctx: ApiContext) =>
      ctx.prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),

    listing: (_: unknown, { slug }: { slug: string }, ctx: ApiContext) =>
      createTrpcCaller(ctx).listings.bySlug({ slug }),

    searchListings: (
      _: unknown,
      args: Record<string, unknown>,
      ctx: ApiContext
    ) => createTrpcCaller(ctx).listings.search(args),

    featuredListings: (
      _: unknown,
      { limit }: { limit?: number },
      ctx: ApiContext
    ) => createTrpcCaller(ctx).listings.featured({ limit: limit ?? 8 }),

    trendingListings: (
      _: unknown,
      { limit }: { limit?: number },
      ctx: ApiContext
    ) => createTrpcCaller(ctx).listings.trending({ limit: limit ?? 12 }),

    similarListings: (
      _: unknown,
      { slug, limit }: { slug: string; limit?: number },
      ctx: ApiContext
    ) =>
      createTrpcCaller(ctx).listings.similar({
        slug,
        limit: limit ?? 4,
      }),

    homepageBanners: (_: unknown, __: unknown, ctx: ApiContext) =>
      ctx.prisma.homepageBanner.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
      }),
  },
};
