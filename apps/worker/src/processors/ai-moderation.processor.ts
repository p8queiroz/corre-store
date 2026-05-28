import OpenAI from "openai";
import { prisma, ModerationDecision } from "@stride/database";
import { env } from "../config/env.js";

/**
 * AI moderation pipeline — flags spam, duplicates, policy violations.
 * Admin review remains the source of truth for approval.
 */
export async function processAiModeration(
  payload: Record<string, unknown>
): Promise<void> {
  const listingId = payload.listingId as string;
  if (!listingId) return;

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return;

  let decision: ModerationDecision = ModerationDecision.PENDING;
  let score = 0.5;
  let reason = "Awaiting review";

  if (env.OPENAI_API_KEY) {
    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
    const result = await openai.moderations.create({
      input: `${listing.title}\n${listing.description}`,
    });

    const flagged = result.results[0]?.flagged ?? false;
    score = Math.max(...Object.values(result.results[0]?.category_scores ?? { default: 0 }));
    if (flagged) {
      decision = ModerationDecision.FLAGGED;
      reason = "OpenAI moderation flagged content";
    } else {
      decision = ModerationDecision.PENDING;
      reason = "Passed automated moderation — pending admin";
    }
  }

  await prisma.moderationLog.create({
    data: {
      listingId,
      source: "ai",
      decision,
      score,
      reason,
    },
  });

  await prisma.listing.update({
    where: { id: listingId },
    data: { moderation: decision, moderationNote: reason },
  });
}
