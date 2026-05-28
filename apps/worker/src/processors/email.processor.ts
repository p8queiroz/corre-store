import nodemailer from "nodemailer";
import { prisma, JobStatus } from "@stride/database";
import { env } from "../config/env.js";

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth:
    env.SMTP_USER && env.SMTP_PASS
      ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
      : undefined,
});

/**
 * Processes EmailOutbox — decouples HTTP request from SMTP latency.
 * Dev: Mailpit on http://localhost:8025
 */
export async function processEmailQueue(): Promise<void> {
  const pending = await prisma.emailOutbox.findMany({
    where: { status: JobStatus.PENDING },
    take: 20,
    orderBy: { createdAt: "asc" },
  });

  for (const email of pending) {
    try {
      await transporter.sendMail({
        from: env.EMAIL_FROM,
        to: email.to,
        subject: email.subject,
        html: email.htmlBody,
      });

      await prisma.emailOutbox.update({
        where: { id: email.id },
        data: { status: JobStatus.COMPLETED, sentAt: new Date() },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Send failed";
      await prisma.emailOutbox.update({
        where: { id: email.id },
        data: { status: JobStatus.FAILED, error: message },
      });
    }
  }
}
