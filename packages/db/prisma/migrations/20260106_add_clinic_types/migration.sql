-- Migration for Adding Clinic Type Configuration
-- =============================================
-- 
-- Migration Name: Add Clinic Type Configuration
-- Description: Expands ClinicType enum and adds type field to Clinic table to support specialty-specific features
-- Date: 2026-01-08
-- Rollback Plan: Revert enum changes and drop type column (see rollback section)

-- ============================================================================
-- PRE-FLIGHT CHECKS
-- ============================================================================
DO $$
BEGIN
  -- Check that the ClinicType enum exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ClinicType') THEN
    RAISE EXCEPTION 'ClinicType enum does not exist - schema may be incorrect';
  END IF;
  
  RAISE NOTICE 'Pre-flight checks passed';
END $$;

-- ============================================================================
-- MAIN MIGRATION
-- ============================================================================

-- Step 1: Expand ClinicType enum with new specialty types
ALTER TYPE "ClinicType" ADD VALUE IF NOT EXISTS 'PEDIATRIC';
ALTER TYPE "ClinicType" ADD VALUE IF NOT EXISTS 'ORTHOPEDIC';
ALTER TYPE "ClinicType" ADD VALUE IF NOT EXISTS 'CARDIOLOGY';
ALTER TYPE "ClinicType" ADD VALUE IF NOT EXISTS 'DERMATOLOGY';
ALTER TYPE "ClinicType" ADD VALUE IF NOT EXISTS 'ENT';
ALTER TYPE "ClinicType" ADD VALUE IF NOT EXISTS 'GYNECOLOGY';
ALTER TYPE "ClinicType" ADD VALUE IF NOT EXISTS 'OPHTHALMOLOGY';
ALTER TYPE "ClinicType" ADD VALUE IF NOT EXISTS 'PSYCHIATRY';

-- Step 2: Add type column to Clinic table (nullable initially)
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "type" "ClinicType";

-- Step 3: Set default value for existing clinics
UPDATE "Clinic" 
SET "type" = 'GENERAL' 
WHERE "type" IS NULL;

-- Step 4: Add comment for documentation
COMMENT ON COLUMN "Clinic"."type" IS 'Clinic specialty type that determines available consultation features';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
  clinic_count INTEGER;
  typed_clinic_count INTEGER;
BEGIN
  -- Verify column was added
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'Clinic' AND column_name = 'type') THEN
    RAISE EXCEPTION 'Migration failed - type column was not added';
  END IF;
  
  -- Verify all existing clinics have a type
  SELECT COUNT(*) INTO clinic_count FROM "Clinic";
  SELECT COUNT(*) INTO typed_clinic_count FROM "Clinic" WHERE "type" IS NOT NULL;
  
  IF clinic_count != typed_clinic_count THEN
    RAISE EXCEPTION 'Migration incomplete - % clinics without type', (clinic_count - typed_clinic_count);
  END IF;
  
  RAISE NOTICE 'Migration verified successfully - % clinics updated', clinic_count;
END $$;

-- ============================================================================
-- ROLLBACK SCRIPT (For reference - do not execute)
-- ============================================================================
-- To rollback this migration, run the following in a new migration:
--
-- -- Remove type column
-- ALTER TABLE "Clinic" DROP COLUMN IF EXISTS "type";
--
-- -- Note: Cannot remove enum values from PostgreSQL enum types
-- -- If rollback is needed, you would need to:
-- -- 1. Create new enum without the added values
-- -- 2. Update all references to use new enum
-- -- 3. Drop old enum
-- -- This is complex and should be done carefully
