-- CreateTable
CREATE TABLE "PatientOtp" (
    "id" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientOtp_phoneNumber_expiresAt_idx" ON "PatientOtp"("phoneNumber", "expiresAt");

-- CreateEnum (idempotent - was previously added via db:push without a migration)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MetricRecordSource') THEN
    CREATE TYPE "MetricRecordSource" AS ENUM ('MANUAL', 'VITALS_FORM', 'OBSERVATION_FORM', 'IMPORT', 'SYSTEM');
  END IF;
END $$;

-- AlterEnum
ALTER TYPE "MetricRecordSource" ADD VALUE IF NOT EXISTS 'PATIENT_PORTAL';
