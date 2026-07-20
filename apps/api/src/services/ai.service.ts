import OpenAI from "openai";
import { prisma } from "@stride/database";
import { aiListingAssistSchema } from "@stride/shared";

/**
 * AI service — synchronous helpers + async heavy work via worker.
 * See docs/PROJECT.md, "AI Features" for the full pipeline explanation.
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
