import OpenAI from "openai";

export type ListingModerationInput = {
  title: string;
  description: string;
  categoryName: string;
  imageUrls: string[];
};

export type ModerationProviderResult = {
  decision: "PENDING" | "FLAGGED";
  confidence: number;
  reason: string;
  flags: string[];
  details: Record<string, unknown>;
};

export interface ListingModerationProvider {
  moderateListingText(input: ListingModerationInput): Promise<ModerationProviderResult>;
  moderateListingImages(input: ListingModerationInput): Promise<ModerationProviderResult>;
  validateImageListingMatch(input: ListingModerationInput): Promise<ModerationProviderResult>;
}

function combineReason(...parts: string[]) {
  return parts.filter(Boolean).join(" ");
}

function mockResult(input: ListingModerationInput): ModerationProviderResult {
  const text = `${input.title} ${input.description}`.toLowerCase();
  const flags: string[] = [];

  if (!input.imageUrls.length) flags.push("missing-images");
  if (/(pix adiantado|upfront payment|fora da plataforma|telegram|spam)/i.test(text)) {
    flags.push("suspicious-payment-language");
  }
  if (!/(shoe|shoes|tenis|tênis|corrida|running|garmin|gel|hydration|hidratação|short|camiseta|watch|relogio|relógio|accessor)/i.test(text)) {
    flags.push("possibly-unrelated-to-running-gear");
  }

  return {
    decision: flags.length ? "FLAGGED" : "PENDING",
    confidence: flags.length ? 0.78 : 0.62,
    reason: flags.length
      ? `Mock moderation found: ${flags.join(", ")}.`
      : "Mock moderation found no obvious policy issue; pending admin review.",
    flags,
    details: {
      provider: "mock",
      note: "Dev provider does not inspect pixels. Add a multimodal provider for production image matching.",
      categoryName: input.categoryName,
      imageCount: input.imageUrls.length,
    },
  };
}

export function createModerationProvider(apiKey?: string): ListingModerationProvider {
  const openai = apiKey ? new OpenAI({ apiKey }) : null;

  return {
    async moderateListingText(input) {
      if (!openai) return mockResult(input);

      const result = await openai.moderations.create({
        input: `${input.title}\n${input.description}`,
      });
      const first = result.results[0];
      const flagged = first?.flagged ?? false;
      const scores = Object.values(first?.category_scores ?? { default: 0 });
      const confidence = scores.length ? Math.max(...scores) : 0.5;
      const flags = first
        ? Object.entries(first.categories)
            .filter(([, value]) => Boolean(value))
            .map(([key]) => `text-${key}`)
        : [];

      return {
        decision: flagged ? "FLAGGED" : "PENDING",
        confidence,
        reason: flagged
          ? "OpenAI text moderation flagged this listing."
          : "OpenAI text moderation found no policy issue; pending admin review.",
        flags,
        details: { provider: "openai-text-moderation", rawFlagged: flagged },
      };
    },

    async moderateListingImages(input) {
      const imageFlags: string[] = [];
      if (!input.imageUrls.length) imageFlags.push("missing-images");

      return {
        decision: imageFlags.length ? "FLAGGED" : "PENDING",
        confidence: imageFlags.length ? 0.7 : 0.45,
        reason: imageFlags.length
          ? "Image checks need admin review."
          : "No image safety provider is configured; admin review remains required.",
        flags: imageFlags,
        details: {
          provider: "mock-image-moderation",
          note: "Simple wa.me MVP does not require WhatsApp Business API. Likewise, image moderation is abstracted so a paid/free multimodal provider can be added later.",
          imageUrls: input.imageUrls,
        },
      };
    },

    async validateImageListingMatch(input) {
      const mock = mockResult(input);
      return {
        ...mock,
        reason: combineReason(
          mock.flags.length ? "Potential listing/category consistency issue." : "",
          "Image/category matching is using the dev provider until a multimodal provider is configured."
        ),
        details: {
          ...mock.details,
          provider: "mock-image-listing-match",
        },
      };
    },
  };
}
