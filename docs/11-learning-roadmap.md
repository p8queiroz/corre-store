# 11 — Step-by-Step Learning Roadmap

Follow this order to learn the **current AI + full-stack flow** end-to-end.

---

## Phase 1 — Foundation (Day 1–2)

### Step 1: Read architecture

- [00-overview.md](./00-overview.md)
- [01-architecture.md](./01-architecture.md)

**Outcome:** You can draw the web → API → DB → worker diagram from memory.

### Step 2: Boot the stack

- [02-getting-started.md](./02-getting-started.md)
- Run Docker, migrate, seed, all three apps

**Outcome:** Homepage shows featured listing from seed.

### Step 3: Trace a GraphQL read

1. Open `apps/web/src/app/page.tsx`
2. Follow `HOMEPAGE_QUERY` → API resolver → `listingService.getFeatured`

**Outcome:** You understand Server Components + Apollo for reads.

---

## Phase 2 — Auth & RBAC (Day 3–4)

### Step 4: Register and verify email

1. Register new user at `/register`
2. Check Mailpit
3. Trace `auth.service.ts` → `enqueueEmail`

Read [03-authentication.md](./03-authentication.md)

### Step 5: Login and session

1. Login as seller seed account
2. Inspect `stride_session` cookie (httpOnly)
3. Call `GET /auth/me`

### Step 6: RBAC

1. Try `/sell` logged out vs as seller
2. Read `roleProcedure` in `apps/api/src/trpc/trpc.ts`
3. Read [10-admin-and-rbac.md](./10-admin-and-rbac.md)

**Outcome:** You can explain why admin is seed-only.

---

## Phase 3 — Marketplace core (Day 5–7)

### Step 7: Database model

- Study `schema.prisma` with [04-database.md](./04-database.md)
- Use Prisma Studio to explore relations

### Step 8: Create a listing

1. Login as seller
2. Submit `/sell` form
3. Watch `BackgroundJob` rows appear in Studio

### Step 9: Search & filters

1. Use `/search?q=nike`
2. Trace `listingService.search` filter builder

**Outcome:** You understand listing lifecycle and denormalized `trendingScore`.

---

## Phase 4 — Workers & email (Day 8–9)

### Step 10: Worker poller

1. Run worker with logging
2. Create listing → see `ai-moderation` + `ai-embedding` jobs complete
3. Read [07-workers.md](./07-workers.md)

### Step 11: Email outbox

1. Register user → verify Mailpit received 2 emails
2. Trace `EmailOutbox` table status transitions

**Outcome:** You can articulate outbox vs synchronous SMTP.

---

## Phase 5 — AI integrations (Day 10–14)

### Step 12: Listing assistant

1. Set `OPENAI_API_KEY`
2. Use AI button on `/sell`
3. Read [06-ai-features.md](./06-ai-features.md) §1

### Step 13: Natural language search

1. Homepage AI hero query
2. Trace GPT keyword extraction → SQL search

### Step 14: Moderation worker

1. Submit listing with edgy text (in dev)
2. Inspect `ModerationLog` in database

### Step 15: Embeddings

1. Confirm `listing.embedding` populated after job
2. Plan pgvector upgrade (documented in architecture)

### Step 16: Chat assistant

1. Extend `ai.chat` with search tool (exercise)
2. Optional: embed widget on all pages

**Outcome:** You know when AI runs sync vs async and why.

---

## Phase 6 — Production thinking (Day 15+)

### Step 17: Media pipeline

- [09-media-uploads.md](./09-media-uploads.md)
- Implement `sharp` + S3

### Step 18: Admin panel

- Build approve/reject UI
- Listing approval emails

### Step 19: Deploy

- Dockerize each app
- Managed PostgreSQL + Redis
- CDN for images
- Secrets via vault / platform env

### Step 20: Observability

- Structured logging (pino)
- Error tracking (Sentry)
- AI cost dashboards

---

## Suggested capstone projects

1. **Semantic search** with pgvector + "more like this"
2. **Seller analytics dashboard** with AI pricing tips
3. **Duplicate listing detector** using embeddings
4. **Mobile app** using JWT + same GraphQL API

---

## Documentation index

| # | Doc |
|---|-----|
| 00 | [Overview](./00-overview.md) |
| 01 | [Architecture](./01-architecture.md) |
| 02 | [Getting started](./02-getting-started.md) |
| 03 | [Authentication](./03-authentication.md) |
| 04 | [Database](./04-database.md) |
| 05 | [GraphQL & tRPC](./05-graphql-and-trpc.md) |
| 06 | [AI features](./06-ai-features.md) |
| 07 | [Workers](./07-workers.md) |
| 08 | [Frontend](./08-frontend.md) |
| 09 | [Media uploads](./09-media-uploads.md) |
| 10 | [Admin & RBAC](./10-admin-and-rbac.md) |
| 11 | **This roadmap** |

Happy learning.
