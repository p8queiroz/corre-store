import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .url("Use a valid URL")
  .max(240)
  .optional()
  .or(z.literal(""));

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  whatsappNumber: z.string().trim().max(32).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  state: z.string().trim().max(80).optional().or(z.literal("")),
  bio: z.string().trim().max(600).optional().or(z.literal("")),
  instagramUrl: optionalUrl,
  stravaUrl: optionalUrl,
  websiteUrl: optionalUrl,
});

export const avatarSchema = z.object({
  avatarUrl: z.string().min(1).max(500).nullable(),
});

export const contactSellerSchema = z.object({
  listingId: z.string().cuid(),
  listingUrl: z.string().url().optional(),
});

export const reportSchema = z.object({
  listingId: z.string().cuid().optional(),
  sellerId: z.string().cuid().optional(),
  reason: z.string().trim().min(3).max(120),
  details: z.string().trim().max(1000).optional().or(z.literal("")),
}).refine((data) => data.listingId || data.sellerId, {
  message: "Report a listing or a seller",
  path: ["listingId"],
});

export const listingStatusActionSchema = z.object({
  listingId: z.string().cuid(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
export type ContactSellerInput = z.infer<typeof contactSellerSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
