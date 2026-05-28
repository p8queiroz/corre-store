# StrideMarket — AI Learning Marketplace

An **educational full-stack monorepo** that teaches modern marketplace architecture through a single-niche classified platform (**running gear**). Inspired by OLX, Facebook Marketplace, and Mercado Livre UX patterns.

> **Primary goal:** learn scalable architecture, auth/RBAC, AI integrations, workers, and media pipelines — with **documentation-first** explanations at every layer.

## What you will learn

| Topic | Where |
|-------|--------|
| Monorepo & service boundaries | [docs/01-architecture.md](./docs/01-architecture.md) |
| Local dev & Docker | [docs/02-getting-started.md](./docs/02-getting-started.md) |
| Auth, sessions, RBAC | [docs/03-authentication.md](./docs/03-authentication.md) |
| Prisma data model | [docs/04-database.md](./docs/04-database.md) |
| GraphQL + tRPC APIs | [docs/05-graphql-and-trpc.md](./docs/05-graphql-and-trpc.md) |
| AI features (listing assist, search, moderation, chat) | [docs/06-ai-features.md](./docs/06-ai-features.md) |
| Background workers & email | [docs/07-workers.md](./docs/07-workers.md) |
| Next.js + MUI frontend | [docs/08-frontend.md](./docs/08-frontend.md) |
| Media uploads | [docs/09-media-uploads.md](./docs/09-media-uploads.md) |
| Admin & RBAC | [docs/10-admin-and-rbac.md](./docs/10-admin-and-rbac.md) |
| Learning roadmap (step-by-step) | [docs/11-learning-roadmap.md](./docs/11-learning-roadmap.md) |

## Repository structure

```
stride-market/
├── apps/
│   ├── web/          # Next.js 15 + MUI + Apollo + tRPC client
│   ├── api/          # Express + GraphQL + tRPC + iron-session
│   └── worker/       # Job poller + AI + email processors
├── packages/
│   ├── database/     # Prisma schema & client
│   └── shared/       # Zod schemas, constants, shared types
├── docs/             # Tutorial documentation (start here)
├── docker-compose.yml
└── .env.example
```

## Quick start

```bash
# 1. Clone and install
cp .env.example .env
# Edit SESSION_SECRET (32+ chars) and optional OPENAI_API_KEY

npm install

# 2. Start infrastructure
docker compose up -d

# 3. Database
npm run db:generate
npm run db:migrate
npm run db:seed

# 4. Run all services (separate terminals)
npm run dev:api
npm run dev:worker
npm run dev:web
```

| Service | URL |
|---------|-----|
| Web | http://localhost:3000 |
| API | http://localhost:4000 |
| GraphQL | http://localhost:4000/graphql |
| Mailpit (dev email) | http://localhost:8025 |
| Prisma Studio | `npm run db:studio` |

### Demo accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@stridemarket.local | Password123! |
| Seller | seller@stridemarket.local | Password123! |
| Buyer | buyer@stridemarket.local | Password123! |

## Tech stack

- **Frontend:** Next.js, TypeScript, MUI, Apollo Client, React Hook Form, Zod, tRPC client
- **API:** Express, GraphQL (`graphql-http`), tRPC, iron-session, bcrypt, multer, Zod
- **Worker:** Express poller, OpenAI SDK, nodemailer
- **Data:** PostgreSQL, Prisma ORM
- **AI:** OpenAI (GPT-4o-mini, embeddings, moderation)

## User roles

- **User** — browse, search, favorites, contact sellers
- **Seller** — create/manage listings, AI listing assistant, dashboard (extend in roadmap)
- **Admin** — moderation, banners, featured listings (**no public admin signup**)

## License

MIT — educational use.
