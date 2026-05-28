# 05 — GraphQL & tRPC APIs

## GraphQL layer

- **Server:** `graphql-http` on Express (`/graphql`)
- **Schema:** `apps/api/src/graphql/typeDefs.ts`
- **Resolvers:** `apps/api/src/graphql/resolvers.ts`

### When to use

- Homepage aggregated query (`HOMEPAGE_QUERY`)
- Listing search with filters
- Public read-heavy endpoints

### Example: homepage query

```graphql
query Homepage {
  categories { slug name }
  featuredListings(limit: 8) { title slug priceCents }
}
```

Client: `apps/web/src/graphql/queries.ts` + Apollo (`apps/web/src/lib/apollo.ts`).

### Context

Each request builds `ApiContext` with `prisma` + session — see `apps/api/src/context.ts`.

## tRPC layer

- **Router:** `apps/api/src/trpc/router.ts`
- **Client:** `apps/web/src/lib/trpc.ts`

### When to use

- Mutations needing strict types (create listing, toggle favorite)
- AI procedures called from React hooks
- Seller/admin dashboards (future)

### Example: create listing

```typescript
// Server
listings.create: roleProcedure("SELLER")
  .input(createListingSchema)
  .mutation(({ ctx, input }) =>
    listingService.create(ctx.session.userId, input)
  );
```

```typescript
// Client
const create = trpc.listings.create.useMutation();
await create.mutateAsync(formData);
```

### Seller listing management

Authenticated seller workflows stay in tRPC:

- `listings.listMine` returns the signed-in seller's listings, including image, category, status, and moderation state.
- `listings.getMine` loads one seller-owned listing for editing.
- `listings.updateMine` updates supported listing fields and replaces the listing image URL set when `imageUrls` is provided.

Seller procedures use `roleProcedure("SELLER")`, so regular users must enable seller tools before using them. The service also checks listing ownership server-side; admins retain access through the existing role hierarchy. Edited listings are set back to `PENDING_REVIEW` with `PENDING` moderation and enqueue the existing moderation and embedding jobs.

### superjson

Handles `Date`, `Map`, etc. between server and client — configured in `initTRPC` and tRPC client.

## Validation strategy

1. **Zod schemas** in `@stride/shared` (single source of truth)
2. **Parse at service boundary** — `createListingSchema.parse(raw)`
3. GraphQL args validated in service layer (not GraphQL-Scalars) for simplicity in v0

## Error handling

- REST: `AppError` → JSON `{ error, code }`
- tRPC: `TRPCError` with `UNAUTHORIZED` / `FORBIDDEN`
- GraphQL: throws bubble to graphql-http (add `formatError` in production)

## Exercise

Add GraphQL mutation `toggleFavorite` and compare ergonomics vs existing tRPC implementation.
