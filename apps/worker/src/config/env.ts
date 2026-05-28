import { z } from "zod";

const envSchema = z.object({
  WORKER_PORT: z.coerce.number().default(4001),
  DATABASE_URL: z.string(),
  OPENAI_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default("StrideMarket <noreply@stridemarket.local>"),
  POLL_INTERVAL_MS: z.coerce.number().default(3000),
});

export const env = envSchema.parse({
  WORKER_PORT: process.env.WORKER_PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM,
  POLL_INTERVAL_MS: process.env.POLL_INTERVAL_MS,
});
