CREATE TYPE "AppointmentRequestStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
);

CREATE TABLE "AppointmentRequest" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "preferredDoctorId" TEXT,
  "preferredDate" TIMESTAMP(3) NOT NULL,
  "preferredTime" TEXT,
  "reason" TEXT NOT NULL,
  "notes" TEXT,
  "status" "AppointmentRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "responseMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AppointmentRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AppointmentRequest"
  ADD CONSTRAINT "AppointmentRequest_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppointmentRequest"
  ADD CONSTRAINT "AppointmentRequest_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AppointmentRequest"
  ADD CONSTRAINT "AppointmentRequest_preferredDoctorId_fkey"
  FOREIGN KEY ("preferredDoctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AppointmentRequest"
  ADD CONSTRAINT "AppointmentRequest_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "AppointmentRequest_clinicId_status_createdAt_idx"
  ON "AppointmentRequest"("clinicId", "status", "createdAt");

CREATE INDEX "AppointmentRequest_patientId_status_idx"
  ON "AppointmentRequest"("patientId", "status");

CREATE INDEX "AppointmentRequest_preferredDoctorId_idx"
  ON "AppointmentRequest"("preferredDoctorId");

CREATE INDEX "AppointmentRequest_reviewedById_idx"
  ON "AppointmentRequest"("reviewedById");
