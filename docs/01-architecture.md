# 01 — Architecture

## Clean separation of concerns

| Layer | Location | Responsibility |
|-------|----------|----------------|
| UI | `apps/web` | Rendering, forms, client state |
| HTTP API | `apps/api` | Auth, validation, orchestration |
| Workers | `apps/worker` | Slow/async: email, AI, images |
| Data | `packages/database` | Prisma schema + client |
| Contracts | `packages/shared` | Zod schemas, constants, types |

**Rule:** UI never talks to PostgreSQL directly. Workers never expose public HTTP except health checks.

## Why GraphQL *and* tRPC?

Both coexist intentionally (common in mature products):

| Use case | Protocol | Reason |
|----------|----------|--------|
| Homepage, search, listing detail | **GraphQL** | Flexible reads, Apollo cache, great for feeds |
| Seller dashboard, AI assist, favorites | **tRPC** | End-to-end TypeScript types with Next.js |

You could standardize on one — the dual setup teaches trade-offs.

## Authentication architecture

```
Browser → POST /auth/login → API validates bcrypt
         → iron-session cookie (httpOnly, signed)
         → Subsequent requests include cookie
         → GraphQL/tRPC context reads session
```

- **No admin signup** in frontend — `UserRole.ADMIN` only via seed/CLI.
- **Refresh tokens** modeled in DB for future mobile clients (`RefreshToken` table).
- See [03-authentication.md](./03-authentication.md).

## Job queue (educational pattern)

Production systems often use **BullMQ + Redis**. This project uses a **database outbox** so you understand the pattern without extra infra:

1. API inserts `BackgroundJob` / `EmailOutbox`
2. Worker polls `PENDING` rows
3. Processor runs; status → `COMPLETED` or retry

Upgrade path documented in [07-workers.md](./07-workers.md).

## AI placement

| Feature | Sync (API) | Async (Worker) |
|---------|------------|----------------|
| Listing assistant | ✓ GPT chat completion | — |
| NL search keyword parse | ✓ | Embedding optional |
| Semantic embeddings | — | ✓ |
| Content moderation | — | ✓ OpenAI moderation |
| Seller insights | Future dashboard | ✓ batch analytics |

## Scalability notes

- **Stateless API** — scale horizontally behind a load balancer; session cookie must be sticky or use Redis session store.
- **Worker scaling** — run multiple worker instances with `FOR UPDATE SKIP LOCKED` job claiming (not implemented in v0 — exercise for you).
- **CDN** — serve images from S3 + CloudFront; API only stores URLs.
- **Search** — migrate `embedding` to `pgvector` for cosine similarity at scale.

## Folder conventions

```
apps/api/src/
  config/       # env validation (Zod)
  middleware/   # cross-cutting HTTP concerns
  routes/       # REST auth, uploads
  graphql/      # schema + resolvers
  trpc/         # procedures
  services/     # business logic (repository-style)
```

**Services** encapsulate Prisma calls — resolvers/procedures stay thin.
