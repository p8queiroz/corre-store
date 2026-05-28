import OpenAI from "openai";
import { prisma } from "@stride/database";
import { env } from "../config/env.js";

/**
 * Embedding pipeline — powers semantic search & "find similar" features.
 *
 * Flow:
 * 1. Concatenate title + description + tags
 * 2. Call text-embedding-3-small
 * 3. Store vector on Listing.embedding (pgvector in production)
 */
export async function processAiEmbedding(
  payload: Record<string, unknown>
): Promise<void> {
  const listingId = payload.listingId as string | undefined;
  if (!listingId || !env.OPENAI_API_KEY) return;

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return;

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const text = [listing.title, listing.description, ...listing.tags].join(" ");

  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });

  const embedding = response.data[0]?.embedding ?? [];

  await prisma.listing.update({
    where: { id: listingId },
    data: {
      embedding,
      aiSummary: text.slice(0, 200),
    },
  });
}
