CREATE TYPE "StravaConnectionStatus" AS ENUM ('NOT_CONNECTED', 'VERIFIED', 'DISCONNECTED', 'ERROR');

ALTER TABLE "SellerProfile"
  ADD COLUMN "stravaAthleteId" TEXT,
  ADD COLUMN "stravaDisplayName" TEXT,
  ADD COLUMN "stravaProfileUrl" TEXT,
  ADD COLUMN "stravaVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "stravaScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "stravaConnectionStatus" "StravaConnectionStatus" NOT NULL DEFAULT 'NOT_CONNECTED';

CREATE UNIQUE INDEX "SellerProfile_stravaAthleteId_key" ON "SellerProfile"("stravaAthleteId");
