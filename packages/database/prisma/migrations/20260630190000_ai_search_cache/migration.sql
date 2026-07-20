CREATE TABLE "AiSearchCache" (
  "id" TEXT NOT NULL,
  "normalizedQuery" TEXT NOT NULL,
  "originalQuery" TEXT NOT NULL,
  "parsedQuery" JSONB NOT NULL,
  "resultCount" INTEGER NOT NULL DEFAULT 0,
  "hitCount" INTEGER NOT NULL DEFAULT 0,
  "source" TEXT NOT NULL DEFAULT 'local',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiSearchCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiSearchCache_normalizedQuery_key" ON "AiSearchCache"("normalizedQuery");
CREATE INDEX "AiSearchCache_lastUsedAt_idx" ON "AiSearchCache"("lastUsedAt");
