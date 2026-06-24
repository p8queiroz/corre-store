-- Profile, trust, contact, and moderation metadata.

ALTER TABLE "User"
  ADD COLUMN "whatsappNumber" TEXT,
  ADD COLUMN "whatsappConfirmedAt" TIMESTAMP(3),
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" TEXT,
  ADD COLUMN "bio" TEXT,
  ADD COLUMN "instagramUrl" TEXT,
  ADD COLUMN "stravaUrl" TEXT,
  ADD COLUMN "websiteUrl" TEXT,
  ADD COLUMN "deactivatedAt" TIMESTAMP(3);

CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

ALTER TABLE "PasswordResetToken"
  ADD CONSTRAINT "PasswordResetToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Listing"
  ADD COLUMN "aiModerationResult" JSONB,
  ADD COLUMN "aiModerationConfidence" DOUBLE PRECISION,
  ADD COLUMN "aiModerationFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "imageQualityNotes" JSONB;

ALTER TABLE "ListingImage"
  ADD COLUMN "mimeType" TEXT,
  ADD COLUMN "fileSizeBytes" INTEGER,
  ADD COLUMN "width" INTEGER,
  ADD COLUMN "height" INTEGER,
  ADD COLUMN "qualityFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "qualityNotes" JSONB;

ALTER TABLE "Inquiry"
  ADD COLUMN "sellerId" TEXT,
  ADD COLUMN "contactMethod" TEXT NOT NULL DEFAULT 'WHATSAPP',
  ADD COLUMN "contactUrl" TEXT;

CREATE INDEX "Inquiry_sellerId_idx" ON "Inquiry"("sellerId");

ALTER TABLE "Inquiry"
  ADD CONSTRAINT "Inquiry_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Report"
  ADD COLUMN "sellerId" TEXT;

CREATE INDEX "Report_sellerId_idx" ON "Report"("sellerId");

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ModerationLog"
  ADD COLUMN "flags" JSONB;
