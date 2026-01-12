-- Migration Template for Safe Database Changes
-- =============================================
-- 
-- How to use this template:
-- 1. Copy this file and rename it according to your migration
-- 2. Fill in the sections below
-- 3. Review ALL changes before running
-- 4. Test on a copy of production data first
--
-- Naming convention: YYYYMMDD_descriptive_name.sql
-- Example: 20260106_add_patient_insurance_fields.sql

-- ============================================================================
-- MIGRATION METADATA
-- ============================================================================
-- Migration Name: [Descriptive name]
-- Description: [What this migration does and why]
-- Author: [Your name]
-- Date: [YYYY-MM-DD]
-- Ticket/Issue: [Link to related issue]
-- Rollback Plan: [How to reverse this migration]

-- ============================================================================
-- PRE-FLIGHT CHECKS
-- ============================================================================
-- Verify preconditions before running migration
-- If any check fails, the migration will abort

DO $$
BEGIN
  -- Example: Check that a column doesn't already exist
  -- IF EXISTS (SELECT 1 FROM information_schema.columns 
  --            WHERE table_name = 'Patient' AND column_name = 'newColumn') THEN
  --   RAISE EXCEPTION 'Column already exists - migration may have already run';
  -- END IF;
  
  -- Example: Check for null values that would block NOT NULL constraint
  -- IF EXISTS (SELECT 1 FROM "Patient" WHERE "someField" IS NULL) THEN
  --   RAISE EXCEPTION 'Null values exist in someField - clean up data first';
  -- END IF;
  
  -- Add your precondition checks here
  RAISE NOTICE 'Pre-flight checks passed';
END $$;

-- ============================================================================
-- BACKUP CRITICAL DATA (Optional but recommended for destructive changes)
-- ============================================================================
-- Create backup of affected data for rollback reference
-- Uncomment and modify as needed

-- CREATE TABLE IF NOT EXISTS "_backup_Patient_20260106" AS 
-- SELECT * FROM "Patient" WHERE condition;

-- ============================================================================
-- MAIN MIGRATION
-- ============================================================================

-- SECTION 1: Add new columns (safe operation)
-- -------------------------------------------
-- Always add with DEFAULT or allow NULL initially

-- ALTER TABLE "Patient" ADD COLUMN "insuranceProvider" TEXT;
-- ALTER TABLE "Patient" ADD COLUMN "insurancePolicyNumber" TEXT;
-- ALTER TABLE "Patient" ADD COLUMN "insuranceExpiryDate" TIMESTAMP(3);

-- SECTION 2: Create new tables
-- -------------------------------------------

-- CREATE TABLE "NewTable" (
--   "id" TEXT NOT NULL,
--   "clinicId" TEXT NOT NULL,
--   "name" TEXT NOT NULL,
--   "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   "updatedAt" TIMESTAMP(3) NOT NULL,
--   
--   CONSTRAINT "NewTable_pkey" PRIMARY KEY ("id")
-- );

-- SECTION 3: Add indexes (can be slow on large tables)
-- -------------------------------------------
-- Consider using CONCURRENTLY for production

-- CREATE INDEX "Patient_insuranceProvider_idx" ON "Patient"("insuranceProvider");

-- SECTION 4: Add foreign key constraints
-- -------------------------------------------

-- ALTER TABLE "NewTable" ADD CONSTRAINT "NewTable_clinicId_fkey" 
--   FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SECTION 5: Data migration
-- -------------------------------------------
-- Migrate existing data to new structure

-- UPDATE "Patient" SET "insuranceProvider" = 'Unknown' WHERE "insuranceProvider" IS NULL;

-- SECTION 6: Add NOT NULL constraints (after data migration)
-- -------------------------------------------

-- ALTER TABLE "Patient" ALTER COLUMN "insuranceProvider" SET NOT NULL;

-- ============================================================================
-- DANGEROUS OPERATIONS (Requires extra caution)
-- ============================================================================
-- These operations can cause data loss. Think twice before uncommenting.

-- DROP COLUMN (data loss!)
-- ALTER TABLE "Patient" DROP COLUMN "oldColumn";

-- DROP TABLE (data loss!)
-- DROP TABLE "OldTable";

-- TRUNCATE (data loss!)
-- TRUNCATE TABLE "TempTable";

-- TYPE CHANGE (may fail or truncate data)
-- ALTER TABLE "Patient" ALTER COLUMN "field" TYPE VARCHAR(50);

-- ============================================================================
-- POST-MIGRATION VALIDATION
-- ============================================================================
-- Verify the migration completed successfully

DO $$
DECLARE
  row_count INTEGER;
BEGIN
  -- Example: Verify new column exists
  -- IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
  --                WHERE table_name = 'Patient' AND column_name = 'insuranceProvider') THEN
  --   RAISE EXCEPTION 'Post-migration validation failed: column not created';
  -- END IF;
  
  -- Example: Verify no null values in required field
  -- SELECT COUNT(*) INTO row_count FROM "Patient" WHERE "newRequiredField" IS NULL;
  -- IF row_count > 0 THEN
  --   RAISE EXCEPTION 'Post-migration validation failed: % null values found', row_count;
  -- END IF;
  
  -- Example: Verify referential integrity
  -- SELECT COUNT(*) INTO row_count FROM "NewTable" n 
  --   LEFT JOIN "Clinic" c ON n."clinicId" = c."id" 
  --   WHERE c."id" IS NULL;
  -- IF row_count > 0 THEN
  --   RAISE EXCEPTION 'Post-migration validation failed: % orphaned records', row_count;
  -- END IF;
  
  RAISE NOTICE 'Post-migration validation passed';
END $$;

-- ============================================================================
-- ROLLBACK SCRIPT
-- ============================================================================
-- Keep this commented out. Uncomment and run manually if rollback is needed.

-- -- Rollback: Remove new columns
-- ALTER TABLE "Patient" DROP COLUMN IF EXISTS "insuranceProvider";
-- ALTER TABLE "Patient" DROP COLUMN IF EXISTS "insurancePolicyNumber";
-- ALTER TABLE "Patient" DROP COLUMN IF EXISTS "insuranceExpiryDate";

-- -- Rollback: Drop new tables
-- DROP TABLE IF EXISTS "NewTable";

-- -- Rollback: Restore from backup (if backup was created)
-- -- INSERT INTO "Patient" SELECT * FROM "_backup_Patient_20260106"
-- --   ON CONFLICT (id) DO UPDATE SET ... ;

-- ============================================================================
-- CLEANUP
-- ============================================================================
-- Remove backup tables after confirming migration is stable (run manually later)

-- DROP TABLE IF EXISTS "_backup_Patient_20260106";
