import { z } from "zod";

export const listingConditionEnum = z.enum([
  "NEW",
  "LIKE_NEW",
  "GOOD",
  "FAIR",
  "FOR_PARTS",
]);

export const createListingSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(20).max(5000),
  priceCents: z.number().int().positive().max(100_000_000),
  condition: listingConditionEnum,
  categoryId: z.string().cuid(),
  city: z.string().min(2).max(80),
  state: z.string().min(2).max(80),
  tags: z.array(z.string().max(40)).max(15).default([]),
});

export const updateListingSchema = createListingSchema.partial();

export const aiListingAssistSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  goal: z.enum(["improve", "seo", "tags", "title"]).default("improve"),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
