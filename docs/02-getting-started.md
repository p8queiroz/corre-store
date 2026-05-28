# 02 — Getting Started

## Prerequisites

- **Node.js 20+**
- **Docker Desktop** (PostgreSQL, Redis, Mailpit)
- **OpenAI API key** (optional — AI features degrade gracefully to mocks)

## Step 1 — Environment

```bash
cp .env.example .env
```

Generate a session secret:

```bash
openssl rand -base64 32
```

Set in `.env`:

```
SESSION_SECRET="<your-generated-secret>"
```

Optional:

```
OPENAI_API_KEY="sk-..."
```

## Step 2 — Install dependencies

From repository root:

```bash
npm install
```

Workspaces install `apps/*` and `packages/*` together.

## Step 3 — Start infrastructure

```bash
docker compose up -d
```

| Container | Purpose | Port |
|-----------|---------|------|
| postgres | Primary database | 5432 |
| redis | Reserved for future queue/cache | 6379 |
| mailpit | Catches outbound email | SMTP 1025, UI 8025 |

Verify:

```bash
docker compose ps
```

## Step 4 — Database setup

```bash
npm run db:generate   # Prisma client
npm run db:migrate    # Apply migrations
npm run db:seed       # Demo users + listings
```

Open Prisma Studio:

```bash
npm run db:studio
```

## Step 5 — Run applications

Use **three terminals**:

```bash
npm run dev:api      # :4000
npm run dev:worker     # :4001
npm run dev:web        # :3000
```

### Health checks

```bash
curl http://localhost:4000/health
curl http://localhost:4001/health
```

### GraphQL playground

Send POST to `http://localhost:4000/graphql`:

```graphql
query {
  categories { slug name }
  featuredListings(limit: 4) { title slug priceCents }
}
```

## Step 6 — Verify email flow

1. Register at http://localhost:3000/register
2. Open Mailpit: http://localhost:8025
3. Confirm verification email appears

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `SESSION_SECRET` too short | Must be 32+ characters for iron-session |
| Prisma can't connect | `docker compose up -d` and check `DATABASE_URL` |
| Empty homepage | Run `npm run db:seed` |
| tRPC unauthorized on /sell | Login as `seller@stridemarket.local` |
| AI returns placeholders | Set `OPENAI_API_KEY` in `.env` and restart API/worker |

## Next

[03-authentication.md](./03-authentication.md)
