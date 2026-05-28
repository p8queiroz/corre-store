import { z } from "zod";
import {
  aiListingAssistSchema,
  createListingSchema,
  naturalLanguageSearchSchema,
} from "@stride/shared";
import { router, publicProcedure, protectedProcedure, roleProcedure } from "./trpc.js";
import { listingService } from "../services/listing.service.js";
import { aiService } from "../services/ai.service.js";

/**
 * tRPC — end-to-end type safety between API and Next.js client.
 * Use for dashboards and forms; GraphQL remains ideal for listing feeds.
 */
export const appRouter = router({
  listings: router({
    search: publicProcedure
      .input(z.record(z.unknown()))
      .query(({ input }) => listingService.search(input)),

    bySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(({ input }) => listingService.getBySlug(input.slug)),

    create: roleProcedure("SELLER")
      .input(createListingSchema)
      .mutation(({ ctx, input }) =>
        listingService.create(ctx.session.userId, input)
      ),
  }),

  ai: router({
    assistListing: roleProcedure("SELLER")
      .input(aiListingAssistSchema)
      .mutation(({ input }) => aiService.assistListing(input)),

    naturalLanguageSearch: publicProcedure
      .input(naturalLanguageSearchSchema)
      .mutation(({ input }) => aiService.naturalLanguageSearch(input)),

    chat: publicProcedure
      .input(
        z.object({
          sessionId: z.string().cuid().optional(),
          message: z.string().min(1).max(2000),
        })
      )
      .mutation(({ ctx, input }) =>
        aiService.chat({
          sessionId: input.sessionId,
          message: input.message,
          userId: ctx.userId,
        })
      ),
  }),

  favorites: router({
    list: protectedProcedure.query(({ ctx }) =>
      ctx.prisma.favorite.findMany({
        where: { userId: ctx.session!.userId },
        include: {
          listing: {
            include: {
              images: { take: 1 },
              category: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      })
    ),

    toggle: protectedProcedure
      .input(z.object({ listingId: z.string().cuid() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await ctx.prisma.favorite.findUnique({
          where: {
            userId_listingId: {
              userId: ctx.session!.userId,
              listingId: input.listingId,
            },
          },
        });

        if (existing) {
          await ctx.prisma.favorite.delete({ where: { id: existing.id } });
          await ctx.prisma.listing.update({
            where: { id: input.listingId },
            data: { favoriteCount: { decrement: 1 } },
          });
          return { favorited: false };
        }

        await ctx.prisma.favorite.create({
          data: {
            userId: ctx.session!.userId,
            listingId: input.listingId,
          },
        });
        await ctx.prisma.listing.update({
          where: { id: input.listingId },
          data: { favoriteCount: { increment: 1 } },
        });
        return { favorited: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
