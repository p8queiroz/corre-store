import rateLimit from "express-rate-limit";
import { RATE_LIMITS } from "@stride/shared";

export const globalRateLimiter = rateLimit({
  windowMs: 60_000,
  max: RATE_LIMITS.API_PER_MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 60_000,
  max: RATE_LIMITS.AUTH_PER_MINUTE,
  message: { error: "Too many auth attempts. Try again later." },
});
