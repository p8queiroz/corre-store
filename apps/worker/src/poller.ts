import { prisma, JobStatus } from "@stride/database";
import { JOB_QUEUES } from "@stride/shared";
import { env } from "./config/env.js";
import { processEmailQueue } from "./processors/email.processor.js";
import { processImageJob } from "./processors/image.processor.js";
import { processAiModeration } from "./processors/ai-moderation.processor.js";
import { processAiEmbedding } from "./processors/ai-embedding.processor.js";
import { processTrendingRecalc } from "./processors/trending.processor.js";

export function startJobPoller(): void {
  setInterval(async () => {
    try {
      await processEmailQueue();
      await processPendingJobs();
    } catch (err) {
      console.error("[worker] poll error", err);
    }
  }, env.POLL_INTERVAL_MS);
}

async function processPendingJobs(): Promise<void> {
  const jobs = await prisma.backgroundJob.findMany({
    where: { status: JobStatus.PENDING },
    orderBy: { scheduledAt: "asc" },
    take: 10,
  });

  for (const job of jobs) {
    await prisma.backgroundJob.update({
      where: { id: job.id },
      data: { status: JobStatus.PROCESSING, startedAt: new Date() },
    });

    try {
      const payload = job.payload as Record<string, unknown>;

      switch (job.queue) {
        case JOB_QUEUES.EMAIL:
          await processEmailQueue();
          break;
        case JOB_QUEUES.IMAGE_PROCESSING:
          await processImageJob(payload);
          break;
        case JOB_QUEUES.AI_MODERATION:
          await processAiModeration(payload);
          break;
        case JOB_QUEUES.AI_EMBEDDING:
          await processAiEmbedding(payload);
          break;
        case JOB_QUEUES.TRENDING_RECALC:
          await processTrendingRecalc();
          break;
        default:
          console.warn(`[worker] unknown queue: ${job.queue}`);
      }

      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status: JobStatus.COMPLETED,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const attempts = job.attempts + 1;
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: {
          status:
            attempts >= job.maxAttempts
              ? JobStatus.FAILED
              : JobStatus.PENDING,
          attempts,
          error: message,
        },
      });
    }
  }
}
