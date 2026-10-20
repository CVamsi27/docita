-- Objects that production gets from migrations but `prisma db push` cannot
-- create, because the Prisma datamodel has no representation for them
-- (EXCLUDE constraints, triggers, and the extensions only they need).
-- `setupTestDatabase` applies this file after each push so the test database
-- carries the same invariants production runs with; without them, concurrency
-- tests pass or fail differently than production would.
--
-- Keep this file in sync with:
--   20260525130000_appointment_overlap_exclusion (superseded by)
--   20260603000000_fix_appointment_overlap_exclusion_include_rescheduling
--   20260601120000_preserve_existing_user_onboarding_completion
-- pg_trgm is already covered by the datasource `extensions` list.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
DROP CONSTRAINT IF EXISTS "Appointment_no_active_overlap";

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_no_active_overlap"
EXCLUDE USING gist (
  "clinicId" WITH =,
  "doctorId" WITH =,
  tstzrange("startTime", "endTime") WITH &&
)
WHERE (status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'RESCHEDULING'));

CREATE OR REPLACE FUNCTION enforce_user_clinic_onboarding_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."clinicId" IS NOT NULL THEN
    NEW."onboardingStep" := 'COMPLETED';
    NEW."onboardingCompletedAt" := COALESCE(
      NEW."onboardingCompletedAt",
      CURRENT_TIMESTAMP
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "User_clinic_onboarding_completion_trigger" ON "User";
CREATE TRIGGER "User_clinic_onboarding_completion_trigger"
BEFORE INSERT OR UPDATE OF "clinicId", "onboardingStep", "onboardingCompletedAt"
ON "User"
FOR EACH ROW
EXECUTE FUNCTION enforce_user_clinic_onboarding_completion();
