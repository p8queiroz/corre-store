import { z } from "zod";
import {
  aiListingAssistSchema,
  avatarSchema,
  changePasswordSchema,
  contactSellerSchema,
  createListingSchema,
  listingStatusActionSchema,
  profileSchema,
  reportSchema,
  updateListingSchema,
} from "@stride/shared";
import { router, publicProcedure, protectedProcedure, roleProcedure } from "./trpc.js";
import { listingService } from "../services/listing.service.js";
import { aiService } from "../services/ai.service.js";
import { adminService } from "../services/admin.service.js";
import { ListingStatus, UserRole, UserStatus } from "@stride/database";
import { accountService } from "../services/account.service.js";
import { contactService } from "../services/contact.service.js";

/**
 * tRPC — end-to-end type safety between API and Next.js client.
 * Use for dashboards and forms; GraphQL remains ideal for listing feeds.
 */
export const appRouter = router({
  account: router({
    me: protectedProcedure.query(({ ctx }) =>
      accountService.me(ctx.session.userId)
    ),

    updateProfile: protectedProcedure
      .input(profileSchema)
      .mutation(({ ctx, input }) =>
        accountService.updateProfile(ctx.session.userId, input)
      ),

    updateAvatar: protectedProcedure
      .input(avatarSchema)
      .mutation(({ ctx, input }) =>
        accountService.updateAvatar(ctx.session.userId, input)
      ),

    changePassword: protectedProcedure
      .input(changePasswordSchema)
      .mutation(({ ctx, input }) =>
        accountService.changePassword(ctx.session.userId, input)
      ),

    deactivate: protectedProcedure.mutation(({ ctx }) =>
      accountService.deactivate(ctx.session.userId)
    ),
  }),

  listings: router({
    search: publicProcedure
      .input(z.record(z.unknown()))
      .query(({ input }) => listingService.search(input)),

    bySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(({ input }) => listingService.getBySlug(input.slug)),

    publicSeller: publicProcedure
      .input(z.object({ userId: z.string().cuid() }))
      .query(({ input }) => listingService.getPublicSeller(input.userId)),

    create: roleProcedure("SELLER")
      .input(createListingSchema)
      .mutation(({ ctx, input }) =>
        listingService.create(ctx.session.userId, input)
      ),

    listMine: roleProcedure("SELLER").query(({ ctx }) =>
      listingService.listMine(ctx.session.userId, ctx.session.role)
    ),

    getMine: roleProcedure("SELLER")
      .input(z.object({ listingId: z.string().cuid() }))
      .query(({ ctx, input }) =>
        listingService.getMine(ctx.session.userId, ctx.session.role, input.listingId)
      ),

    updateMine: roleProcedure("SELLER")
      .input(
        z.object({
          listingId: z.string().cuid(),
          data: updateListingSchema,
        })
      )
      .mutation(({ ctx, input }) =>
        listingService.updateMine(
          ctx.session.userId,
          ctx.session.role,
          input.listingId,
          input.data
        )
      ),

    pauseMine: roleProcedure("SELLER")
      .input(listingStatusActionSchema)
      .mutation(({ ctx, input }) =>
        listingService.setMineStatus(
          ctx.session.userId,
          ctx.session.role,
          input.listingId,
          ListingStatus.PAUSED
        )
      ),

    markSoldMine: roleProcedure("SELLER")
      .input(listingStatusActionSchema)
      .mutation(({ ctx, input }) =>
        listingService.setMineStatus(
          ctx.session.userId,
          ctx.session.role,
          input.listingId,
          ListingStatus.SOLD
        )
      ),

    reactivateMine: roleProcedure("SELLER")
      .input(listingStatusActionSchema)
      .mutation(({ ctx, input }) =>
        listingService.setMineStatus(
          ctx.session.userId,
          ctx.session.role,
          input.listingId,
          ListingStatus.ACTIVE
        )
      ),

    duplicateMine: roleProcedure("SELLER")
      .input(listingStatusActionSchema)
      .mutation(({ ctx, input }) =>
        listingService.duplicateMine(ctx.session.userId, ctx.session.role, input.listingId)
      ),
  }),

  contact: router({
    seller: protectedProcedure
      .input(contactSellerSchema)
      .mutation(({ ctx, input }) =>
        contactService.contactSeller(ctx.session.userId, input)
      ),

    myInquiries: protectedProcedure.query(({ ctx }) =>
      contactService.myInquiries(ctx.session.userId)
    ),
  }),

  reports: router({
    create: protectedProcedure
      .input(reportSchema)
      .mutation(({ ctx, input }) =>
        contactService.report(ctx.session.userId, input)
      ),
  }),

  ai: router({
    assistListing: roleProcedure("SELLER")
      .input(aiListingAssistSchema)
      .mutation(({ input }) => aiService.assistListing(input)),

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

  admin: router({
    dashboard: roleProcedure("ADMIN").query(() => adminService.dashboard()),

    moderationQueue: roleProcedure("ADMIN").query(() =>
      adminService.moderationQueue()
    ),

    listings: roleProcedure("ADMIN").query(() => adminService.listings()),

    approveListing: roleProcedure("ADMIN")
      .input(z.object({ listingId: z.string().cuid() }))
      .mutation(({ ctx, input }) =>
        adminService.approveListing(ctx.session.userId, input.listingId)
      ),

    rejectListing: roleProcedure("ADMIN")
      .input(
        z.object({
          listingId: z.string().cuid(),
          note: z.string().min(3).max(1000),
        })
      )
      .mutation(({ ctx, input }) =>
        adminService.rejectListing(ctx.session.userId, input.listingId, input.note)
      ),

    setListingFeatured: roleProcedure("ADMIN")
      .input(z.object({ listingId: z.string().cuid(), featured: z.boolean() }))
      .mutation(({ input }) =>
        adminService.setListingFeatured(input.listingId, input.featured)
      ),

    users: roleProcedure("ADMIN").query(() => adminService.users()),

    promoteUser: roleProcedure("ADMIN")
      .input(
        z.object({
          userId: z.string().cuid(),
          role: z.enum([UserRole.SELLER, UserRole.ADMIN]),
        })
      )
      .mutation(({ input }) => adminService.promoteUser(input.userId, input.role)),

    setUserStatus: roleProcedure("ADMIN")
      .input(z.object({ userId: z.string().cuid(), status: z.nativeEnum(UserStatus) }))
      .mutation(({ input }) => adminService.setUserStatus(input.userId, input.status)),

    banners: roleProcedure("ADMIN").query(() => adminService.banners()),

    createBanner: roleProcedure("ADMIN")
      .input(
        z.object({
          title: z.string().min(3).max(120),
          subtitle: z.string().max(240).optional(),
          imageUrl: z.string().min(1),
          linkUrl: z.string().max(240).optional(),
          sortOrder: z.number().int().default(0),
          active: z.boolean().default(true),
        })
      )
      .mutation(({ input }) => adminService.createBanner(input)),

    updateBanner: roleProcedure("ADMIN")
      .input(
        z.object({
          id: z.string().cuid(),
          title: z.string().min(3).max(120).optional(),
          subtitle: z.string().max(240).nullable().optional(),
          imageUrl: z.string().min(1).optional(),
          linkUrl: z.string().max(240).nullable().optional(),
          sortOrder: z.number().int().optional(),
          active: z.boolean().optional(),
        })
      )
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return adminService.updateBanner(id, data);
      }),

    reports: roleProcedure("ADMIN").query(() => adminService.reports()),

    resolveReport: roleProcedure("ADMIN")
      .input(z.object({ id: z.string().cuid(), resolved: z.boolean() }))
      .mutation(({ input }) => adminService.resolveReport(input.id, input.resolved)),

    jobs: roleProcedure("ADMIN").query(() => adminService.jobs()),
  }),
});

export type AppRouter = typeof appRouter;
