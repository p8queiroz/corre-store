import { prisma, ModerationDecision, Prisma } from "@stride/database";
import { env } from "../config/env.js";
import { createModerationProvider } from "../services/moderation-provider.js";

/**
 * AI moderation pipeline — flags spam, duplicates, policy violations.
 * Admin review remains the source of truth for approval.
 */
export async function processAiModeration(
  payload: Record<string, unknown>
): Promise<void> {
  const listingId = payload.listingId as string;
  if (!listingId) return;

  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!listing) return;

  let decision: ModerationDecision = ModerationDecision.PENDING;
  let score = 0.5;
  let reason = "Awaiting review";
  const input = {
    title: listing.title,
    description: listing.description,
    categoryName: listing.category.name,
    imageUrls: listing.images.map((image) => image.url),
  };
  const provider = createModerationProvider(env.OPENAI_API_KEY);
  const [textResult, imageResult, matchResult] = await Promise.all([
    provider.moderateListingText(input),
    provider.moderateListingImages(input),
    provider.validateImageListingMatch(input),
  ]);
  const flags = Array.from(
    new Set([...textResult.flags, ...imageResult.flags, ...matchResult.flags])
  );
  const flagged = [textResult, imageResult, matchResult].some(
    (result) => result.decision === "FLAGGED"
  );

  decision = flagged ? ModerationDecision.FLAGGED : ModerationDecision.PENDING;
  score = Math.max(textResult.confidence, imageResult.confidence, matchResult.confidence);
  reason = flagged
    ? `AI moderation flagged this listing: ${flags.join(", ")}.`
    : "AI moderation found no obvious issue; pending admin approval.";

  await prisma.moderationLog.create({
    data: {
      listingId,
      source: "ai",
      decision,
      score,
      reason,
      flags: {
        text: textResult.flags,
        images: imageResult.flags,
        match: matchResult.flags,
      },
    },
  });

  await prisma.listing.update({
    where: { id: listingId },
    data: {
      moderation: decision,
      moderationNote: reason,
      aiModerationConfidence: score,
      aiModerationFlags: flags,
      aiModerationResult: {
        text: textResult,
        images: imageResult,
        match: matchResult,
      } as Prisma.InputJsonValue,
    },
  });
}
