import { prisma, ListingStatus, ModerationDecision } from "@stride/database";

/**
 * Recalculates trendingScore from views, favorites, and recency.
 * Run on a schedule in production (cron / queue).
 */
export async function processTrendingRecalc(): Promise<void> {
  const listings = await prisma.listing.findMany({
    where: {
      status: ListingStatus.ACTIVE,
      moderation: ModerationDecision.APPROVED,
    },
    select: {
      id: true,
      viewCount: true,
      favoriteCount: true,
      publishedAt: true,
    },
  });

  const now = Date.now();

  for (const listing of listings) {
    const ageHours =
      (now - (listing.publishedAt?.getTime() ?? now)) / (1000 * 60 * 60);
    const recencyBoost = Math.max(0, 100 - ageHours);
    const score =
      listing.viewCount * 0.3 +
      listing.favoriteCount * 2 +
      recencyBoost;

    await prisma.listing.update({
      where: { id: listing.id },
      data: { trendingScore: score },
    });
  }
}
