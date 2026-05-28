import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { ApiContext } from "../context.js";
import type { AppRole } from "@stride/shared";
import { hasMinimumRole } from "@stride/shared";

const t = initTRPC.context<ApiContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: { ...ctx, session: ctx.session },
  });
});

export function roleProcedure(minRole: AppRole) {
  return protectedProcedure.use(({ ctx, next }) => {
    if (!hasMinimumRole(ctx.session.role, minRole)) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({ ctx });
  });
}
