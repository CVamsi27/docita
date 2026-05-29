-- Add PlanMode enum + Clinic.planMode column. Additive: existing rows
-- default to FULL, which preserves current feature access. Legacy
-- FRONT_DESK_* rows on `Clinic.tier` continue to render as Front Desk via
-- `mapDbClinicTierToTierAndMode` regardless of this column.

DO $$ BEGIN
  CREATE TYPE "PlanMode" AS ENUM ('FULL', 'FRONT_DESK', 'CORE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "Clinic"
  ADD COLUMN IF NOT EXISTS "planMode" "PlanMode" NOT NULL DEFAULT 'FULL';
