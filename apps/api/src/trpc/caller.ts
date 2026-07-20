import type { ApiContext } from "../context.js";
import { createCallerFactory } from "./trpc.js";
import { appRouter } from "./router.js";

/**
 * In-process tRPC caller — used by GraphQL resolvers to orchestrate
 * domain procedures without an HTTP hop to /trpc.
 */
export const createCaller = createCallerFactory(appRouter);

export function createTrpcCaller(ctx: ApiContext) {
  return createCaller(ctx);
}
