export type ParsedSearchIntent = {
  keywords: string[];
  categorySlug?: string;
};

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
  return {
    keywords: searchTerms(query),
    categorySlug: categorySlugsForQuery(query)[0],
  };
}
