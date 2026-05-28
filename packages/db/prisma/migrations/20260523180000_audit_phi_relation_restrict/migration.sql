-- Audit follow-up: harden PHI-bearing relations.
-- Adds explicit ON DELETE semantics to relations the prior PR1 sweep missed:
-- - Patient.user (optional FK): SET NULL — patient record outlives a deleted user account.
-- - Appointment.doctor / Appointment.patient: RESTRICT — never silently lose audit-bearing PHI.
-- - Prescription.doctor / Prescription.patient: RESTRICT — same.
-- Constraint refinement only; no row-level data change.

-- Patient.user (optional)
ALTER TABLE "Patient" DROP CONSTRAINT IF EXISTS "Patient_userId_fkey";
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Appointment.doctor
ALTER TABLE "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_doctorId_fkey";
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Appointment.patient
ALTER TABLE "Appointment" DROP CONSTRAINT IF EXISTS "Appointment_patientId_fkey";
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prescription.doctor
ALTER TABLE "Prescription" DROP CONSTRAINT IF EXISTS "Prescription_doctorId_fkey";
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Prescription.patient
ALTER TABLE "Prescription" DROP CONSTRAINT IF EXISTS "Prescription_patientId_fkey";
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
