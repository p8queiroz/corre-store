/**
 * StrideMarket API entry point
 *
 * Architecture (see docs/01-architecture.md):
 * - Express as HTTP server
 * - GraphQL at /graphql (public reads + authenticated mutations)
 * - tRPC at /trpc (type-safe procedures for Next.js)
 * - iron-session cookies for browser auth
 * - Jobs enqueued to worker via BackgroundJob table
 */
import { createServer } from "node:http";
import cors from "cors";
import express, { type Request, type Response } from "express";
import helmet from "helmet";
import { createHandler } from "graphql-http/lib/use/express";
import { createContext } from "./context.js";
import { env } from "./config/env.js";
import { sessionMiddleware } from "./middleware/session.js";
import { authRouter } from "./routes/auth.routes.js";
import { uploadRouter } from "./routes/upload.routes.js";
import { schema } from "./graphql/schema.js";
import { appRouter } from "./trpc/router.js";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { globalRateLimiter } from "./middleware/rate-limit.js";
import { errorHandler } from "./middleware/error-handler.js";

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: env.WEB_ORIGIN,
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(sessionMiddleware);
app.use(globalRateLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "stride-api" });
});

app.use("/auth", authRouter);
app.use("/uploads", uploadRouter);

app.all(
  "/graphql",
  createHandler({
    schema,
    context: async (req) => {
      const expressReq = req as unknown as Request;
      return createContext({ req: expressReq, res: expressReq.res as Response });
    },
  })
);

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext: ({ req, res }) => createContext({ req, res }),
  })
);

app.use(errorHandler);

const server = createServer(app);

server.listen(env.API_PORT, () => {
  console.log(`[api] http://localhost:${env.API_PORT}`);
  console.log(`[api] GraphQL http://localhost:${env.API_PORT}/graphql`);
  console.log(`[api] tRPC    http://localhost:${env.API_PORT}/trpc`);
});
