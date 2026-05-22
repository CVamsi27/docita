-- check-migration-reversibility: one-way
-- Continue the tier canonicalization in a separate migration so enum value
-- additions from the previous migration are committed before data rewrites run.

-- Update Clinic.tier rows
UPDATE "Clinic" SET "tier" = 'STARTER'       WHERE "tier" = 'CAPTURE';
UPDATE "Clinic" SET "tier" = 'ESSENTIAL'     WHERE "tier" IN ('CORE', 'PLUS');
UPDATE "Clinic" SET "tier" = 'PROFESSIONAL'  WHERE "tier" IN ('PRO', 'CLINIC');

-- Update Subscription.plan rows
UPDATE "Subscription" SET "plan" = 'STARTER'       WHERE "plan" = 'CAPTURE';
UPDATE "Subscription" SET "plan" = 'ESSENTIAL'     WHERE "plan" IN ('CORE', 'PLUS');
UPDATE "Subscription" SET "plan" = 'PROFESSIONAL'  WHERE "plan" IN ('PRO', 'CLINIC');

-- Update TierPricing.tier rows (unique constraint, update in order)
UPDATE "TierPricing" SET "tier" = 'STARTER'       WHERE "tier" = 'CAPTURE';
UPDATE "TierPricing" SET "tier" = 'PROFESSIONAL'  WHERE "tier" = 'PRO';
DELETE FROM "TierPricing" WHERE "tier" IN ('PLUS', 'CLINIC');
UPDATE "TierPricing" SET "tier" = 'ESSENTIAL'     WHERE "tier" = 'CORE';

-- Recreate the ClinicTier enum with only canonical values
CREATE TYPE "ClinicTier_new" AS ENUM ('STARTER', 'ESSENTIAL', 'PROFESSIONAL', 'ENTERPRISE');

ALTER TABLE "Clinic" ALTER COLUMN "tier" DROP DEFAULT;
ALTER TABLE "Subscription" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "TierPricing" ALTER COLUMN "tier" DROP DEFAULT;

ALTER TABLE "Clinic"
  ALTER COLUMN "tier" TYPE "ClinicTier_new"
  USING "tier"::text::"ClinicTier_new";

ALTER TABLE "Subscription"
  ALTER COLUMN "plan" TYPE "ClinicTier_new"
  USING "plan"::text::"ClinicTier_new";

ALTER TABLE "TierPricing"
  ALTER COLUMN "tier" TYPE "ClinicTier_new"
  USING "tier"::text::"ClinicTier_new";

DROP TYPE "ClinicTier";
ALTER TYPE "ClinicTier_new" RENAME TO "ClinicTier";

ALTER TABLE "Clinic" ALTER COLUMN "tier" SET DEFAULT 'STARTER';
ALTER TABLE "Subscription" ALTER COLUMN "plan" SET DEFAULT 'ESSENTIAL';
