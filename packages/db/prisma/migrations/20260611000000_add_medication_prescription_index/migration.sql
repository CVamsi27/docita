-- Index the Medication -> Prescription foreign key.
--
-- Medications are loaded almost exclusively through the prescription relation
-- (`include: { medications: true }` in medical-history, patient-timeline, and
-- PDF generation), which Prisma issues as
-- `SELECT ... FROM "Medication" WHERE "prescriptionId" IN ($1, ...)`.
-- The table has no clinicId, so none of the existing indexes cover this; the
-- query was a sequential scan that grows with every prescription written.
-- Additive index only (reversible); matches the non-concurrent convention of
-- 20260603030000_add_missing_indexes.

CREATE INDEX IF NOT EXISTS "Medication_prescriptionId_idx"
  ON "Medication" ("prescriptionId");
