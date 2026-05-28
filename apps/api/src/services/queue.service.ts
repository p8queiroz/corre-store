import { prisma, EmailType, JobStatus } from "@stride/database";
import { JOB_QUEUES } from "@stride/shared";

/**
 * Job queue pattern (educational simplification):
 * - API writes rows to BackgroundJob / EmailOutbox
 * - Worker polls and processes (see apps/worker)
 * - Production: replace with BullMQ + Redis while keeping same interfaces
 */

interface EnqueueEmailInput {
  to: string;
  subject: string;
  htmlBody: string;
  type: string;
}

const emailTypeMap: Record<string, EmailType> = {
  WELCOME: EmailType.WELCOME,
  VERIFY_EMAIL: EmailType.VERIFY_EMAIL,
  FORGOT_PASSWORD: EmailType.FORGOT_PASSWORD,
  PASSWORD_RESET: EmailType.PASSWORD_RESET,
  SELLER_APPROVED: EmailType.SELLER_APPROVED,
  LISTING_APPROVED: EmailType.LISTING_APPROVED,
  LISTING_REJECTED: EmailType.LISTING_REJECTED,
  INQUIRY_NOTIFICATION: EmailType.INQUIRY_NOTIFICATION,
  GENERIC: EmailType.GENERIC,
};

export async function enqueueEmail(input: EnqueueEmailInput): Promise<void> {
  const type = emailTypeMap[input.type] ?? EmailType.GENERIC;

  await prisma.emailOutbox.create({
    data: {
      to: input.to,
      subject: input.subject,
      htmlBody: input.htmlBody,
      type,
      status: JobStatus.PENDING,
    },
  });

  await prisma.backgroundJob.create({
    data: {
      queue: JOB_QUEUES.EMAIL,
      payload: { emailOutbox: true },
      status: JobStatus.PENDING,
    },
  });
}

export async function enqueueJob(
  queue: (typeof JOB_QUEUES)[keyof typeof JOB_QUEUES],
  payload: Record<string, unknown>
): Promise<string> {
  const job = await prisma.backgroundJob.create({
    data: {
      queue,
      payload: payload as object,
      status: JobStatus.PENDING,
    },
  });
  return job.id;
}
