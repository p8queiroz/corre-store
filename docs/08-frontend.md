# 08 — Frontend (Next.js + MUI)

## App Router structure

```
apps/web/src/app/
  page.tsx                 # Homepage (Server Component + GraphQL)
  search/page.tsx          # Search results (Client + Apollo)
  listings/[slug]/page.tsx # Detail (Server Component)
  category/[slug]/page.tsx
  (auth)/login|register/
  sell/page.tsx            # Seller form + AI assist (tRPC)
  favorites/page.tsx
  admin/page.tsx           # Protected admin (wire middleware)
```

## Data fetching patterns

| Pattern | Used for |
|---------|----------|
| Server Component + `getApolloClient()` | SEO-friendly listing detail, homepage |
| Client `useQuery` (Apollo) | Interactive search |
| Client `trpc.*.useMutation` | Forms, AI, favorites |

See `apps/web/src/lib/apollo-server.ts` for RSC integration.

## MUI theme

`apps/web/src/theme.ts` — marketplace-focused:

- **Primary green** — trust, sport, outdoors
- **Secondary orange** — CTA / conversion accents
- Rounded cards — modern classified aesthetic

## Forms

React Hook Form + Zod resolver + schemas from `@stride/shared`:

```typescript
useForm<LoginInput>({ resolver: zodResolver(loginSchema) });
```

Same schema validates on API — **no drift** between client and server.

## Key components

| Component | Role |
|-----------|------|
| `SiteHeader` | Search bar, nav, sell CTA |
| `ListingCard` | Grid tile with price + location |
| `AiSearchHero` | NL discovery entry point |

## Accessibility & SEO

- Semantic headings on listing detail
- `metadata` export in root layout
- Add `alt` on images when upload pipeline provides alt text (AI-generated optional)

## Exercise

1. Add `loading.tsx` skeletons for search grid
2. Implement `middleware.ts` for `/admin` and `/sell`
3. Add seller dashboard charts with MUI X Charts
