-- I01 — insurance claim submission durability and external evidence.
--
-- Two gaps are closed here. `SUBMITTED` previously meant only "marked submitted
-- locally", so nothing recorded that the claim reached the insurer and a crash
-- before delivery left a claim that read as filed and was never retried. And
-- `InsuranceClaimEvent` had no field for insurer evidence, so a denial or
-- settlement recorded locally was indistinguishable from one the insurer
-- actually decided.

-- CreateEnum
CREATE TYPE "ClaimEventSource" AS ENUM ('LOCAL_ACTION', 'INSURER_RESPONSE', 'RECONCILIATION');

-- CreateEnum
CREATE TYPE "ClaimSubmissionStatus" AS ENUM ('NOT_ATTEMPTED', 'IN_FLIGHT', 'SENT', 'FAILED', 'LEGACY_UNVERIFIED');

-- AlterTable
ALTER TABLE "InsuranceClaim" ADD COLUMN     "externalClaimReference" TEXT,
ADD COLUMN     "submissionAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "submissionClaimToken" TEXT,
ADD COLUMN     "submissionClaimedAt" TIMESTAMPTZ(3),
ADD COLUMN     "submissionLastError" TEXT,
ADD COLUMN     "submissionStatus" "ClaimSubmissionStatus" NOT NULL DEFAULT 'NOT_ATTEMPTED',
ADD COLUMN     "submittedToInsurerAt" TIMESTAMPTZ(3);

-- AlterTable
ALTER TABLE "InsuranceClaimEvent" ADD COLUMN     "decidedAt" TIMESTAMPTZ(3),
ADD COLUMN     "externalReference" TEXT,
ADD COLUMN     "providerCode" TEXT,
ADD COLUMN     "source" "ClaimEventSource" NOT NULL DEFAULT 'LOCAL_ACTION';

-- Backfill (AGENTS.md 9.4, existing-user compatibility).
--
-- Claims already SUBMITTED before this migration were never tracked for
-- delivery, so their true delivery state is unknown. Leaving them at the
-- NOT_ATTEMPTED default would make the retry sweep treat them as undelivered
-- work and file them with insurers that never received them. They are marked
-- LEGACY_UNVERIFIED instead: still "we do not know", but excluded from the
-- sweep until a human reconciles them.
UPDATE "InsuranceClaim"
SET "submissionStatus" = 'LEGACY_UNVERIFIED'
WHERE "status" = 'SUBMITTED'
  AND "submissionStatus" = 'NOT_ATTEMPTED'
  AND "submittedAt" IS NOT NULL;

-- CreateIndex
CREATE INDEX "InsuranceClaim_submissionStatus_submissionClaimedAt_idx" ON "InsuranceClaim"("submissionStatus", "submissionClaimedAt");