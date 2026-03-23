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
