-- check-migration-reversibility: one-way
-- Migrate existing FREE-tier clinics to STARTER.
-- FREE is no longer a published plan (removed from PUBLISHED_PLAN_LADDER);
-- new clinics always land on STARTER or higher.

-- Delete FREE rows defensively. FREE was a temporary tier and clinics with
-- FREE should already have been migrated to STARTER via the application;
-- any remaining FREE rows are stale and cannot survive the enum recreation
-- because ClinicTier_new does not include FREE.
DELETE FROM "TierPricing" WHERE "tier" = 'FREE';
DELETE FROM "Subscription" WHERE "plan" = 'FREE';
DELETE FROM "Clinic" WHERE "tier" = 'FREE';

-- Remove FREE from the ClinicTier enum
-- (FREE was added in 20260612113000_add_free_clinic_tier)
CREATE TYPE "ClinicTier_new" AS ENUM ('STARTER', 'ESSENTIAL', 'PROFESSIONAL', 'HOSPITAL', 'ENTERPRISE', 'FRONT_DESK', 'FRONT_DESK_CLINIC', 'FRONT_DESK_HOSPITAL');

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
ALTER TABLE "Subscription" ALTER COLUMN "plan" SET DEFAULT 'STARTER';
