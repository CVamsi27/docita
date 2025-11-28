-- Add indexes on createdAt fields for better query performance
-- These indexes will significantly improve dashboard queries, analytics, and list views

-- Patient table: Improve patient listing and search performance
CREATE INDEX IF NOT EXISTS "Patient_createdAt_idx" ON "Patient"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Patient_clinicId_createdAt_idx" ON "Patient"("clinicId", "createdAt" DESC);

-- Appointment table: Improve appointment listing and calendar views
CREATE INDEX IF NOT EXISTS "Appointment_createdAt_idx" ON "Appointment"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Appointment_clinicId_createdAt_idx" ON "Appointment"("clinicId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Appointment_patientId_createdAt_idx" ON "Appointment"("patientId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Appointment_doctorId_createdAt_idx" ON "Appointment"("doctorId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Appointment_startTime_idx" ON "Appointment"("startTime" DESC);
CREATE INDEX IF NOT EXISTS "Appointment_status_startTime_idx" ON "Appointment"("status", "startTime" DESC);

-- Invoice table: Improve invoice listing and revenue analytics
CREATE INDEX IF NOT EXISTS "Invoice_createdAt_idx" ON "Invoice"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Invoice_patientId_createdAt_idx" ON "Invoice"("patientId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Invoice_status_createdAt_idx" ON "Invoice"("status", "createdAt" DESC);

-- Prescription table: Improve prescription listing
CREATE INDEX IF NOT EXISTS "Prescription_createdAt_idx" ON "Prescription"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Prescription_patientId_createdAt_idx" ON "Prescription"("patientId", "createdAt" DESC);

-- Document table: Improve document listing
CREATE INDEX IF NOT EXISTS "Document_createdAt_idx" ON "Document"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Document_patientId_createdAt_idx" ON "Document"("patientId", "createdAt" DESC);

-- WhatsappLog table: Improve message history queries
CREATE INDEX IF NOT EXISTS "WhatsappLog_createdAt_idx" ON "WhatsappLog"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "WhatsappLog_clinicId_createdAt_idx" ON "WhatsappLog"("clinicId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "WhatsappLog_patientId_createdAt_idx" ON "WhatsappLog"("patientId", "createdAt" DESC);

-- Diagnosis table: Improve medical coding queries
CREATE INDEX IF NOT EXISTS "Diagnosis_createdAt_idx" ON "Diagnosis"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Diagnosis_appointmentId_idx" ON "Diagnosis"("appointmentId");

-- Procedure table: Improve procedure tracking
CREATE INDEX IF NOT EXISTS "Procedure_createdAt_idx" ON "Procedure"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "Procedure_appointmentId_idx" ON "Procedure"("appointmentId");

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS "Appointment_clinic_status_date_idx" ON "Appointment"("clinicId", "status", "startTime" DESC);
