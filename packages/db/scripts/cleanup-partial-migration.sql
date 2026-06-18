-- Cleanup partial migration state from failed attempts.
-- When prisma migrate resolve --rolled-back is used, the migration record is
-- marked as rolled back but the SQL changes are NOT reverted. If a migration
-- partially applied (e.g. CREATE TYPE + ALTER TABLE succeeded but DROP TYPE
-- failed), the database is left in a hybrid state that blocks re-application.
--
-- This script reverts the known partial states so the migration can be
-- re-applied cleanly. It is idempotent — safe to run multiple times.

-- 1. Revert partial ClinicTier_new recreation from
--    20260618120000_migrate_free_clinics_to_starter.
--    If ClinicTier_new exists, tables may already reference it. Convert them
--    back to ClinicTier so the migration can start fresh.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClinicTier_new') THEN
    -- Revert Clinic.tier
    ALTER TABLE "Clinic" ALTER COLUMN "tier" DROP DEFAULT;
    ALTER TABLE "Clinic"
      ALTER COLUMN "tier" TYPE "ClinicTier"
      USING "tier"::text::"ClinicTier";
    ALTER TABLE "Clinic" ALTER COLUMN "tier" SET DEFAULT 'STARTER';

    -- Revert Subscription.plan
    ALTER TABLE "Subscription" ALTER COLUMN "plan" DROP DEFAULT;
    ALTER TABLE "Subscription"
      ALTER COLUMN "plan" TYPE "ClinicTier"
      USING "plan"::text::"ClinicTier";
    ALTER TABLE "Subscription" ALTER COLUMN "plan" SET DEFAULT 'STARTER';

    -- Revert TierPricing.tier (may or may not have been converted)
    ALTER TABLE "TierPricing" ALTER COLUMN "tier" DROP DEFAULT;
    ALTER TABLE "TierPricing"
      ALTER COLUMN "tier" TYPE "ClinicTier"
      USING "tier"::text::"ClinicTier";

    -- Now safe to drop the partial type
    DROP TYPE "ClinicTier_new";
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- If any step fails (e.g. type doesn't exist, column already correct),
  -- swallow and let the migration handle it.
  RAISE NOTICE 'cleanup: skipped ClinicTier_new revert (%)', SQLERRM;
END $$;
