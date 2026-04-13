-- Add composite indexes to eliminate table scans on common filtered queries

-- DoctorSchedule: clinic availability lookup (clinicId + dayOfWeek + isActive)
CREATE INDEX "DoctorSchedule_clinicId_dayOfWeek_isActive_idx"
  ON "DoctorSchedule"("clinicId", "dayOfWeek", "isActive");

-- PatientMedicalCondition: active conditions per patient (patientId + status)
CREATE INDEX "PatientMedicalCondition_patientId_status_idx"
  ON "PatientMedicalCondition"("patientId", "status");

-- PatientAllergy: critical allergy lookup (patientId + severity)
CREATE INDEX "PatientAllergy_patientId_severity_idx"
  ON "PatientAllergy"("patientId", "severity");

-- LabTestOrder: test results by appointment
CREATE INDEX "LabTestOrder_appointmentId_idx"
  ON "LabTestOrder"("appointmentId");

-- WhatsappLog: clinic message filtering by status and date (used in support inbox)
CREATE INDEX "WhatsappLog_clinicId_status_createdAt_idx"
  ON "WhatsappLog"("clinicId", "status", "createdAt");

-- Immunization: patient vaccination history in reverse-chronological order
CREATE INDEX "Immunization_patientId_administeredDate_idx"
  ON "Immunization"("patientId", "administeredDate" DESC);

-- Consent: pending/active consents per clinic
CREATE INDEX "Consent_clinicId_status_idx"
  ON "Consent"("clinicId", "status");

-- MedicationDose: filtered timeline queries (patientId + clinicId + scheduledAt DESC)
CREATE INDEX "MedicationDose_patientId_clinicId_scheduledAt_idx"
  ON "MedicationDose"("patientId", "clinicId", "scheduledAt" DESC);
