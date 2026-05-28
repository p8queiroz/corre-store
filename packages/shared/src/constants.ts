/** Platform niche — single category focus for learning clarity */
export const PLATFORM_NAME = "StrideMarket";
export const PLATFORM_TAGLINE = "Running gear marketplace for athletes";
export const NICHE = "running-gear" as const;

export const JOB_QUEUES = {
  EMAIL: "email",
  IMAGE_PROCESSING: "image-processing",
  AI_MODERATION: "ai-moderation",
  AI_EMBEDDING: "ai-embedding",
  AI_LISTING_ASSIST: "ai-listing-assist",
  TRENDING_RECALC: "trending-recalc",
} as const;

export const RATE_LIMITS = {
  AUTH_PER_MINUTE: 10,
  API_PER_MINUTE: 120,
  UPLOAD_PER_HOUR: 50,
} as const;
