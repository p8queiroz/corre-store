# 07 — Background Workers & Email

## Why a worker service?

HTTP requests must stay fast. These operations are **slow or unreliable**:

- SMTP delivery
- Image resizing / S3 upload
- OpenAI API calls (moderation, embeddings)
- Trending score batch updates

Pattern: **Outbox + poller** (this repo) → evolve to **BullMQ + Redis**.

## Architecture

```
API handler
  → prisma.emailOutbox.create()
  → prisma.backgroundJob.create({ queue: 'email' })
  → return 201 to user immediately

Worker (every 3s)
  → fetch PENDING jobs
  → run processor
  → mark COMPLETED or retry
```

Entry: `apps/worker/src/index.ts`  
Poller: `apps/worker/src/poller.ts`

## Processors

| Queue constant | File | Purpose |
|----------------|------|---------|
| `email` | `email.processor.ts` | Send Mailpit/SMTP |
| `image-processing` | `image.processor.ts` | Thumbnails (stub) |
| `ai-moderation` | `ai-moderation.processor.ts` | OpenAI moderation |
| `ai-embedding` | `ai-embedding.processor.ts` | text-embedding-3-small |
| `trending-recalc` | `trending.processor.ts` | Recompute scores |

## Email flows

| EmailType | Trigger |
|-----------|---------|
| WELCOME | Registration |
| VERIFY_EMAIL | Registration |
| FORGOT_PASSWORD | Forgot password form |
| LISTING_APPROVED | Admin approves (future) |
| INQUIRY_NOTIFICATION | Buyer contacts seller (future) |

View dev emails: http://localhost:8025

## Retry logic

```typescript
attempts >= maxAttempts → JobStatus.FAILED
else → back to PENDING
```

Production: exponential backoff + dead-letter queue.

## Upgrade to BullMQ

1. Keep `enqueueJob` interface
2. Replace Prisma insert with `queue.add(name, payload)`
3. Worker uses `Worker` class with concurrency
4. Keep `EmailOutbox` for audit trail

## Exercise

Implement `FOR UPDATE SKIP LOCKED` job claiming so two worker instances don't process the same job.
