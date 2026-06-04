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
