import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url().or(z.string().startsWith("postgresql://")),
  SESSION_SECRET: z.string().min(32),
  WEB_ORIGIN: z.string().url(),
  STORAGE_LOCAL_PATH: z.string().default("./uploads"),
  REDIS_URL: z.string().optional(),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  API_PORT: process.env.API_PORT,
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  WEB_ORIGIN: process.env.WEB_ORIGIN,
  STORAGE_LOCAL_PATH: process.env.STORAGE_LOCAL_PATH,
  REDIS_URL: process.env.REDIS_URL,
});
