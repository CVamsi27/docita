-- Race-safe double-booking guard for Appointment.
--
-- Background: CreateAppointmentUseCase / RescheduleAppointmentUseCase do a
-- check-then-insert ("validateAppointmentOverlap" then "save"). Under the
-- Postgres default isolation (READ COMMITTED), two parallel bookings for the
-- same doctor on overlapping windows can both pass the application check and
-- both insert, producing a double-booking that no app retry would catch.
--
-- This migration adds a Postgres exclusion constraint enforced by the database
-- itself, scoped to the same (clinicId, doctorId) tuple the application check
-- already uses, and limited to the active statuses considered "blocking". The
-- range is half-open `[start, end)` so a 10:00-10:30 visit does not collide
-- with a 10:30-11:00 visit (matches the existing JS comparator in
-- core/domain-services/appointment-interval-overlap.ts).
--
-- The application-level overlap check is kept as a fast path that returns the
-- conflicting appointment id for nicer error messages. This constraint is the
-- backstop that closes the race window.
--
-- Note: btree_gist is required so the `=` operators on text columns can sit in
-- the same GiST index as the `&&` operator on tstzrange.

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
ADD CONSTRAINT "Appointment_no_active_overlap"
EXCLUDE USING gist (
  "clinicId" WITH =,
  "doctorId" WITH =,
  tstzrange("startTime", "endTime", '[)') WITH &&
)
WHERE (status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'));
