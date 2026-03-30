-- Migration: Add email verification fields to User and PatientDoctor table

-- Email verification fields on User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationToken" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailVerificationExpiresAt" TIMESTAMP(3);

-- Unique index for emailVerificationToken
CREATE UNIQUE INDEX IF NOT EXISTS "User_emailVerificationToken_key" ON "User"("emailVerificationToken");

-- PatientDoctor: tracks which doctors have treated a patient (soft ABAC)
CREATE TABLE IF NOT EXISTS "PatientDoctor" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PatientDoctor_pkey" PRIMARY KEY ("id")
);

-- Unique constraint and indexes
CREATE UNIQUE INDEX IF NOT EXISTS "PatientDoctor_patientId_doctorId_clinicId_key" ON "PatientDoctor"("patientId", "doctorId", "clinicId");
CREATE INDEX IF NOT EXISTS "PatientDoctor_patientId_idx" ON "PatientDoctor"("patientId");
CREATE INDEX IF NOT EXISTS "PatientDoctor_doctorId_idx" ON "PatientDoctor"("doctorId");
CREATE INDEX IF NOT EXISTS "PatientDoctor_clinicId_idx" ON "PatientDoctor"("clinicId");

-- Foreign keys
ALTER TABLE "PatientDoctor" ADD CONSTRAINT "PatientDoctor_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientDoctor" ADD CONSTRAINT "PatientDoctor_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PatientDoctor" ADD CONSTRAINT "PatientDoctor_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
