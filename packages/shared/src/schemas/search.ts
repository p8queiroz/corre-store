import { z } from "zod";
import { listingConditionEnum } from "./listing.js";

export const searchListingsSchema = z.object({
  q: z.string().max(200).optional(),
  categorySlug: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  condition: listingConditionEnum.optional(),
  minPriceCents: z.coerce.number().int().optional(),
  maxPriceCents: z.coerce.number().int().optional(),
  sort: z
    .enum(["newest", "price_asc", "price_desc", "trending"])
    .default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
  /** Natural language query — triggers semantic search via worker embeddings */
  semantic: z.boolean().optional().default(false),
});

export const naturalLanguageSearchSchema = z.object({
  query: z.string().min(3).max(500),
  limit: z.coerce.number().int().min(1).max(24).default(12),
});

export type SearchListingsInput = z.infer<typeof searchListingsSchema>;
