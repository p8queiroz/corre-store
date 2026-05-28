/**
 * StrideMarket Worker
 *
 * Polls BackgroundJob + EmailOutbox tables and runs async pipelines:
 * - Email delivery
 * - Image thumbnails
 * - AI moderation & embeddings
 * - Trending score recalculation
 *
 * See docs/07-workers.md
 */
import express from "express";
import { startJobPoller } from "./poller.js";
import { env } from "./config/env.js";

const app = express();

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "stride-worker" });
});

app.listen(env.WORKER_PORT, () => {
  console.log(`[worker] http://localhost:${env.WORKER_PORT}`);
  startJobPoller();
  console.log("[worker] Job poller started");
});
