import OpenAI from "openai";
import { prisma, Prisma } from "@stride/database";
import { aiListingAssistSchema, naturalLanguageSearchSchema } from "@stride/shared";
import { enqueueJob } from "./queue.service.js";
import { JOB_QUEUES } from "@stride/shared";
import { listingService } from "./listing.service.js";
import {
  normalizeCategoryHint,
  normalizeSearchQuery,
  parseLocalSearchIntent,
  type ParsedSearchIntent,
} from "./search-intent.service.js";

/**
 * AI service — synchronous helpers + async heavy work via worker.
 * See docs/PROJECT.md, "AI Features" for the full pipeline explanation.
 */
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

type CachedSearchIntent = ParsedSearchIntent & {
  source: "cache" | "local" | "openai";
};

function parseCachedIntent(value: Prisma.JsonValue): CachedSearchIntent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords.filter((item): item is string => typeof item === "string")
    : [];
  if (!keywords.length) return null;

  return {
    keywords,
    categorySlug:
      typeof raw.categorySlug === "string"
        ? normalizeCategoryHint(raw.categorySlug)
        : undefined,
    source: "cache",
  };
}

async function parseSearchIntentWithAi(query: string): Promise<CachedSearchIntent> {
  if (!openai) {
    return { ...parseLocalSearchIntent(query), source: "local" };
  }

  const parsed = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Extract marketplace search intent for a running-gear resale site. Return JSON: { keywords: string[], categoryHint?: string }. Use concise keywords in English or Portuguese; do not invent products.",
      },
      { role: "user", content: query },
    ],
    response_format: { type: "json_object" },
  });

  const content = JSON.parse(
    parsed.choices[0]?.message?.content ?? '{"keywords":[]}'
  ) as { keywords?: unknown; categoryHint?: string };
  const local = parseLocalSearchIntent(query);
  const keywords = Array.isArray(content.keywords)
    ? content.keywords.filter((item): item is string => typeof item === "string")
    : [];

  return {
    keywords: keywords.length ? keywords : local.keywords,
    categorySlug: normalizeCategoryHint(content.categoryHint) ?? local.categorySlug,
    source: "openai",
  };
}

export const aiService = {
  async assistListing(raw: unknown) {
    const input = aiListingAssistSchema.parse(raw);

    if (!openai) {
      return {
        title: input.title ?? "Optimized title (set OPENAI_API_KEY)",
        description: input.description ?? "SEO-friendly description placeholder",
        tags: input.tags ?? ["running", "marathon", "gear"],
        source: "mock",
      };
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a marketplace listing assistant for ReRun, where people sell unused items and reinvest the value in what comes next. Return JSON with title, description, tags array.",
        },
        {
          role: "user",
          content: JSON.stringify({ ...input, goal: input.goal }),
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    return { ...JSON.parse(content), source: "openai" };
  },

  async naturalLanguageSearch(raw: unknown) {
    const input = naturalLanguageSearchSchema.parse(raw);
    const normalizedQuery = normalizeSearchQuery(input.query);
    const cached = await prisma.aiSearchCache.findUnique({
      where: { normalizedQuery },
    });

    if (cached) {
      const parsed = parseCachedIntent(cached.parsedQuery);
      if (parsed) {
        const result = await listingService.search({
          q: parsed.keywords.join(" "),
          categorySlug: parsed.categorySlug,
          limit: input.limit,
          semantic: true,
        });
        await prisma.aiSearchCache.update({
          where: { id: cached.id },
          data: {
            hitCount: { increment: 1 },
            resultCount: result.total,
            originalQuery: input.query,
          },
        });

        return {
          ...result,
          parsedQuery: parsed,
          cacheHit: true,
        };
      }
    }

    const parsed = await parseSearchIntentWithAi(input.query);

    // Production path: embed query → cosine similarity vs listing.embedding.
    // We still enqueue the educational embedding job, but parsed intent is cached
    // so repeat searches do not pay for another LLM parsing call.
    await enqueueJob(JOB_QUEUES.AI_EMBEDDING, {
      query: input.query,
      normalizedQuery,
      mode: "search",
    });

    const result = await listingService.search({
      q: parsed.keywords.join(" "),
      categorySlug: parsed.categorySlug,
      limit: input.limit,
      semantic: true,
    });

    await prisma.aiSearchCache.upsert({
      where: { normalizedQuery },
      create: {
        normalizedQuery,
        originalQuery: input.query,
        parsedQuery: {
          keywords: parsed.keywords,
          categorySlug: parsed.categorySlug,
        },
        resultCount: result.total,
        hitCount: 0,
        source: parsed.source,
      },
      update: {
        originalQuery: input.query,
        parsedQuery: {
          keywords: parsed.keywords,
          categorySlug: parsed.categorySlug,
        },
        resultCount: result.total,
        source: parsed.source,
      },
    });

    return {
      ...result,
      parsedQuery: parsed,
      cacheHit: false,
    };
  },

  async chat(input: {
    sessionId?: string;
    message: string;
    userId: string | null;
  }) {
    let sessionId = input.sessionId;

    if (!sessionId) {
      const session = await prisma.chatSession.create({
        data: { userId: input.userId ?? undefined },
      });
      sessionId = session.id;
    }

    await prisma.chatMessage.create({
      data: {
        sessionId,
        role: "user",
        content: input.message,
      },
    });

    let reply =
      "I can help you find running shoes, hydration gear, and more. Try: 'lightweight shoes for marathon beginners'.";

    if (openai) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are the ReRun assistant for a marketplace where people sell unused items and reinvest the value in what comes next. Be concise. Suggest categories and search phrases.",
          },
          { role: "user", content: input.message },
        ],
      });
      reply = response.choices[0]?.message?.content ?? reply;
    }

    await prisma.chatMessage.create({
      data: { sessionId, role: "assistant", content: reply },
    });

    return { sessionId, reply };
  },
};
