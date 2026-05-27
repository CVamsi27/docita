-- Version columns on PHI-bearing tables that were last-write-wins.
-- Additive only: column is NOT NULL with DEFAULT 1 so existing rows backfill
-- on add without deleting or rewriting application data.
--
-- This migration establishes monotonic version tracking. API writes increment
-- these columns where rows are mutable. Hard optimistic conflict enforcement
-- is intentionally deferred until every write client sends the current version
-- in the request contract.

ALTER TABLE "DoctorTimeOff" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Prescription"  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "MedicationDose" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "StaffLeave"    ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
