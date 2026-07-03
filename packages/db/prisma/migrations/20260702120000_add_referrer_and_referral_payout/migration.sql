-- Referral partner + revenue-share payout ledger (additive only)

-- 1. Enums
CREATE TYPE "ReferrerType" AS ENUM ('CLINIC', 'PHARMACY', 'MARKETING_PERSON', 'CUSTOM');
CREATE TYPE "ReferrerRewardKind" AS ENUM ('CREDIT_MONTHS', 'REVENUE_SHARE');
CREATE TYPE "ReferralPayoutStatus" AS ENUM ('PENDING', 'APPROVED', 'PAID', 'VOID');

-- 2. Referrer
CREATE TABLE "Referrer" (
    "id" TEXT NOT NULL,
    "type" "ReferrerType" NOT NULL,
    "rewardKind" "ReferrerRewardKind" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "clinicId" TEXT,
    "rateBands" JSONB,
    "creditConfig" JSONB,
    "payoutDetails" JSONB,
    "firstYearOnly" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "Referrer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Referrer_type_idx" ON "Referrer"("type");
CREATE INDEX "Referrer_clinicId_idx" ON "Referrer"("clinicId");
CREATE INDEX "Referrer_active_idx" ON "Referrer"("active");

-- 3. ReferralPayout (idempotent accrual ledger)
CREATE TABLE "ReferralPayout" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "periodStart" TIMESTAMPTZ(3) NOT NULL,
    "periodEnd" TIMESTAMPTZ(3) NOT NULL,
    "baseRevenueCents" INTEGER NOT NULL,
    "ratePercent" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "ReferralPayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "ReferralPayout_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ReferralPayout_referralId_periodStart_key" ON "ReferralPayout"("referralId", "periodStart");
CREATE INDEX "ReferralPayout_referrerId_idx" ON "ReferralPayout"("referrerId");
CREATE INDEX "ReferralPayout_status_idx" ON "ReferralPayout"("status");

-- 4. Extend Referral (additive columns + index)
ALTER TABLE "Referral" ADD COLUMN "referrerId" TEXT;
ALTER TABLE "Referral" ADD COLUMN "activationAt" TIMESTAMPTZ(3);
ALTER TABLE "Referral" ADD COLUMN "rewardClaimedAt" TIMESTAMPTZ(3);
CREATE INDEX "Referral_referrerId_idx" ON "Referral"("referrerId");

-- 5. Foreign keys
ALTER TABLE "Referral" ADD CONSTRAINT "Referral_referrerId_fkey"
    FOREIGN KEY ("referrerId") REFERENCES "Referrer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReferralPayout" ADD CONSTRAINT "ReferralPayout_referralId_fkey"
    FOREIGN KEY ("referralId") REFERENCES "Referral"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReferralPayout" ADD CONSTRAINT "ReferralPayout_referrerId_fkey"
    FOREIGN KEY ("referrerId") REFERENCES "Referrer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
