export type ParsedSearchIntent = {
  keywords: string[];
  categorySlug?: string;
};

/** Filler words that should not drive local confidence or keyword search. */
const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "bom",
  "boa",
  "boas",
  "bons",
  "buscar",
  "com",
  "da",
  "das",
  "de",
  "do",
  "dos",
  "e",
  "em",
  "encontre",
  "encontrar",
  "estado",
  "eu",
  "find",
  "for",
  "from",
  "good",
  "in",
  "item",
  "itens",
  "me",
  "meu",
  "minha",
  "my",
  "na",
  "nas",
  "need",
  "new",
  "no",
  "nos",
  "nova",
  "novo",
  "o",
  "of",
  "on",
  "or",
  "os",
  "para",
  "pra",
  "preciso",
  "procurando",
  "quero",
  "sem",
  "show",
  "some",
  "something",
  "the",
  "to",
  "um",
  "uma",
  "umas",
  "uns",
  "used",
  "want",
  "with",
  "without",
]);

export function normalizeSearchQuery(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export const CATEGORY_ALIASES: Record<string, string> = {
  calcado: "running-shoes",
  calcados: "running-shoes",
  sapatilha: "running-shoes",
  sneaker: "running-shoes",
  sneakers: "running-shoes",
  "running-shoe": "running-shoes",
  "running-shoes": "running-shoes",
  footwear: "running-shoes",
  shoe: "running-shoes",
  shoes: "running-shoes",
  tenis: "running-shoes",
  tennis: "running-shoes",
  hidratacao: "hydration",
  hydration: "hydration",
  garrafa: "hydration",
  squeeze: "hydration",
  colete: "hydration",
  camiseta: "apparel",
  camisa: "apparel",
  shirt: "apparel",
  shorts: "apparel",
  bermuda: "apparel",
  apparel: "apparel",
  vestuario: "apparel",
  relogio: "wearables",
  wearable: "wearables",
  wearables: "wearables",
  watch: "wearables",
  garmin: "wearables",
  acessorio: "accessories",
  acessorios: "accessories",
  accessory: "accessories",
  accessories: "accessories",
};

export function searchTerms(value: string): string[] {
  const normalized = normalizeSearchQuery(value);
  const terms = new Set<string>([value.trim(), normalized]);
  normalized
    .split(/[^a-z0-9]+/g)
    .filter((term) => term.length >= 2)
    .forEach((term) => terms.add(term));
  return Array.from(terms).filter(Boolean);
}

/** Content tokens only — used for local intent + confidence gating. */
export function meaningfulTerms(value: string): string[] {
  return normalizeSearchQuery(value)
    .split(/[^a-z0-9]+/g)
    .filter((term) => term.length >= 2 && !STOPWORDS.has(term));
}

export function categorySlugsForQuery(value: string): string[] {
  return Array.from(
    new Set(
      searchTerms(value)
        .map((term) => CATEGORY_ALIASES[term])
        .filter((slug): slug is string => Boolean(slug))
    )
  );
}

export function normalizeCategoryHint(value?: string) {
  if (!value) return undefined;
  const normalized = normalizeSearchQuery(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return CATEGORY_ALIASES[normalized] ?? normalized;
}

export function parseLocalSearchIntent(query: string): ParsedSearchIntent {
  const keywords = meaningfulTerms(query);
  return {
    keywords: keywords.length ? keywords : searchTerms(query).slice(0, 5),
    categorySlug: categorySlugsForQuery(query)[0],
  };
}

/**
 * True when local aliases/tokens are enough — skip OpenAI.
 * Long/vague NL sentences without a category signal stay low-confidence.
 */
export function isLocalIntentConfident(
  intent: ParsedSearchIntent,
  query: string
): boolean {
  const terms = meaningfulTerms(query);
  if (!terms.length) return false;

  if (intent.categorySlug && terms.length <= 6) return true;

  // Compact product-like queries with little filler (e.g. "garmin fenix 7")
  if (terms.length >= 1 && terms.length <= 3) {
    const rawWords = normalizeSearchQuery(query).split(/\s+/).filter(Boolean);
    const stopwordCount = rawWords.length - terms.length;
    return stopwordCount <= 1;
  }

  return false;
}
