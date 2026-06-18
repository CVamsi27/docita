-- check-migration-reversibility: one-way
-- Migrate FRONT_DESK_* legacy tier values to canonical (tier, mode=FRONT_DESK).
--
-- FRONT_DESK    → tier = ESSENTIAL, planMode = FRONT_DESK
-- FRONT_DESK_CLINIC  → tier = PROFESSIONAL, planMode = FRONT_DESK
-- FRONT_DESK_HOSPITAL → tier = HOSPITAL, planMode = FRONT_DESK
--
-- After this migration, the ClinicTier enum no longer contains FRONT_DESK_* values.
-- The PlanMode column carries the FRONT_DESK designation instead.

-- Step 1: Convert Clinic.tier + planMode
UPDATE "Clinic" SET "tier" = 'ESSENTIAL',  "planMode" = 'FRONT_DESK' WHERE "tier" = 'FRONT_DESK';
UPDATE "Clinic" SET "tier" = 'PROFESSIONAL', "planMode" = 'FRONT_DESK' WHERE "tier" = 'FRONT_DESK_CLINIC';
UPDATE "Clinic" SET "tier" = 'HOSPITAL',   "planMode" = 'FRONT_DESK' WHERE "tier" = 'FRONT_DESK_HOSPITAL';

-- Step 2: Convert Subscription.plan
UPDATE "Subscription" SET "plan" = 'ESSENTIAL'  WHERE "plan" = 'FRONT_DESK';
UPDATE "Subscription" SET "plan" = 'PROFESSIONAL' WHERE "plan" = 'FRONT_DESK_CLINIC';
UPDATE "Subscription" SET "plan" = 'HOSPITAL'   WHERE "plan" = 'FRONT_DESK_HOSPITAL';

-- Step 3: Convert TierPricing.tier (if any exist for these values)
UPDATE "TierPricing" SET "tier" = 'ESSENTIAL'  WHERE "tier" = 'FRONT_DESK';
UPDATE "TierPricing" SET "tier" = 'PROFESSIONAL' WHERE "tier" = 'FRONT_DESK_CLINIC';
UPDATE "TierPricing" SET "tier" = 'HOSPITAL'   WHERE "tier" = 'FRONT_DESK_HOSPITAL';

-- Step 4: Recreate ClinicTier enum without FRONT_DESK_* values
CREATE TYPE "ClinicTier_new" AS ENUM ('STARTER', 'ESSENTIAL', 'PROFESSIONAL', 'HOSPITAL', 'ENTERPRISE');

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
