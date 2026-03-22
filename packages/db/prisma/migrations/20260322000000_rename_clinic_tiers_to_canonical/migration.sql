-- Migration: Rename ClinicTier enum values to canonical 4-tier system
-- Old values: CAPTURE, CORE, PLUS, PRO, CLINIC, ENTERPRISE
-- New values: STARTER, ESSENTIAL, PROFESSIONAL, ENTERPRISE
--
-- Migration strategy:
-- 1. Add new enum values (additive, safe)
-- 2. Update all existing rows to use new values
-- 3. Recreate the enum with only new values
-- 4. Update column types and defaults

-- Step 1: Add new enum values to ClinicTier
ALTER TYPE "ClinicTier" ADD VALUE IF NOT EXISTS 'STARTER';
ALTER TYPE "ClinicTier" ADD VALUE IF NOT EXISTS 'ESSENTIAL';
ALTER TYPE "ClinicTier" ADD VALUE IF NOT EXISTS 'PROFESSIONAL';

-- Step 2: Update Clinic.tier rows
UPDATE "Clinic" SET "tier" = 'STARTER'       WHERE "tier" = 'CAPTURE';
UPDATE "Clinic" SET "tier" = 'ESSENTIAL'     WHERE "tier" IN ('CORE', 'PLUS');
UPDATE "Clinic" SET "tier" = 'PROFESSIONAL'  WHERE "tier" IN ('PRO', 'CLINIC');

-- Step 3: Update Subscription.plan rows
UPDATE "Subscription" SET "plan" = 'STARTER'       WHERE "plan" = 'CAPTURE';
UPDATE "Subscription" SET "plan" = 'ESSENTIAL'     WHERE "plan" IN ('CORE', 'PLUS');
UPDATE "Subscription" SET "plan" = 'PROFESSIONAL'  WHERE "plan" IN ('PRO', 'CLINIC');

-- Step 4: Update TierPricing.tier rows (unique constraint, update in order)
UPDATE "TierPricing" SET "tier" = 'STARTER'       WHERE "tier" = 'CAPTURE';
UPDATE "TierPricing" SET "tier" = 'PROFESSIONAL'  WHERE "tier" = 'PRO';
-- PLUS and CLINIC rows may exist but are now duplicates — remove them
DELETE FROM "TierPricing" WHERE "tier" IN ('PLUS', 'CLINIC');
UPDATE "TierPricing" SET "tier" = 'ESSENTIAL'     WHERE "tier" = 'CORE';

-- Step 5: Recreate the ClinicTier enum with only canonical values
-- PostgreSQL requires recreating the type to remove values

-- 5a. Create replacement type
CREATE TYPE "ClinicTier_new" AS ENUM ('STARTER', 'ESSENTIAL', 'PROFESSIONAL', 'ENTERPRISE');

-- 5b. Update columns to use new type
ALTER TABLE "Clinic"
  ALTER COLUMN "tier" TYPE "ClinicTier_new"
  USING "tier"::text::"ClinicTier_new";

ALTER TABLE "Subscription"
  ALTER COLUMN "plan" TYPE "ClinicTier_new"
  USING "plan"::text::"ClinicTier_new";

ALTER TABLE "TierPricing"
  ALTER COLUMN "tier" TYPE "ClinicTier_new"
  USING "tier"::text::"ClinicTier_new";

-- 5c. Drop old type and rename new one
DROP TYPE "ClinicTier";
ALTER TYPE "ClinicTier_new" RENAME TO "ClinicTier";

-- Step 6: Update column defaults
ALTER TABLE "Clinic"        ALTER COLUMN "tier" SET DEFAULT 'STARTER';
ALTER TABLE "Subscription"  ALTER COLUMN "plan" SET DEFAULT 'ESSENTIAL';
