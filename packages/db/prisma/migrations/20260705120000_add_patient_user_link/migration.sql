-- Timestamped re-issue of the legacy `add_patient_user_link` migration folder,
-- which lacked the datetime prefix and therefore sorted AFTER every timestamped
-- migration (lexicographic order: "a" > "2"). Environments that already applied
-- the legacy folder are unaffected: every statement below is idempotent, so
-- re-applying is a no-op. Fresh databases now get this change in a
-- deterministic position. See docs/operations/MIGRATION_RENAME_RUNBOOK.md.

-- AlterTable: Add optional userId to Patient table to link Patient to User account
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- CreateIndex: Unique index on Patient.userId (one patient = one user)
CREATE UNIQUE INDEX IF NOT EXISTS "Patient_userId_key" ON "Patient"("userId");

-- AddForeignKey: Link Patient.userId to User.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Patient_userId_fkey'
  ) THEN
    ALTER TABLE "Patient"
      ADD CONSTRAINT "Patient_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
