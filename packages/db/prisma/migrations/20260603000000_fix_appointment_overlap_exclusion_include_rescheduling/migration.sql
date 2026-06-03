-- Add RESCHEDULING to the appointment overlap exclusion constraint.
--
-- The existing constraint (20260525130000) only covers SCHEDULED, CONFIRMED,
-- and IN_PROGRESS statuses. The RESCHEDULING status was missing, creating a
-- race window: two concurrent requests could both pass the application-level
-- overlap check and both insert/update for a slot overlapping a RESCHEDULING
-- appointment, since the DB constraint wouldn't catch it.
--
-- This migration drops the old constraint and recreates it with RESCHEDULING
-- included in the WHERE clause, so the backstop covers all statuses the
-- application considers blocking.

ALTER TABLE "Appointment"
DROP CONSTRAINT IF EXISTS "Appointment_no_active_overlap";

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_no_active_overlap"
EXCLUDE USING gist (
  "clinicId" WITH =,
  "doctorId" WITH =,
  tsrange("startTime", "endTime") WITH &&
)
WHERE (status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'RESCHEDULING'));
