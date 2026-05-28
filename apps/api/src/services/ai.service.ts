import OpenAI from "openai";
import { prisma } from "@stride/database";
import { aiListingAssistSchema, naturalLanguageSearchSchema } from "@stride/shared";
import { enqueueJob } from "./queue.service.js";
import { JOB_QUEUES } from "@stride/shared";
import { listingService } from "./listing.service.js";

/**
 * AI service — synchronous helpers + async heavy work via worker.
 * See docs/06-ai-features.md for the full pipeline explanation.
 */
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

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
            "You are a marketplace listing assistant for running gear. Return JSON with title, description, tags array.",
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

    if (!openai) {
      return listingService.search({ q: input.query, limit: input.limit });
    }

    // Production path: embed query → cosine similarity vs listing.embedding
    // Here we delegate heavy embedding to worker and fall back to keyword search
    await enqueueJob(JOB_QUEUES.AI_EMBEDDING, {
      query: input.query,
      mode: "search",
    });

    const parsed = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Extract search keywords from the user query for a running gear marketplace. Return JSON: { keywords: string[], categoryHint?: string }",
        },
        { role: "user", content: input.query },
      ],
      response_format: { type: "json_object" },
    });

    const { keywords, categoryHint } = JSON.parse(
      parsed.choices[0]?.message?.content ?? '{"keywords":[]}'
    ) as { keywords: string[]; categoryHint?: string };

    return listingService.search({
      q: keywords.join(" "),
      categorySlug: categoryHint,
      limit: input.limit,
      semantic: true,
    });
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
              "You are StrideMarket assistant for a running gear niche marketplace. Be concise. Suggest categories and search phrases.",
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
