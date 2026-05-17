-- Additive schema for clinic-specific WhatsApp senders and enterprise pricing dimensions.

CREATE TYPE "WhatsappSenderMode" AS ENUM ('SHARED', 'BYO', 'MANAGED');
CREATE TYPE "WhatsappSenderStatus" AS ENUM ('NOT_CONFIGURED', 'PENDING_VERIFICATION', 'VERIFIED', 'FAILED', 'REVOKED');

ALTER TABLE "Clinic"
  ADD COLUMN "whatsappSenderMode" "WhatsappSenderMode" NOT NULL DEFAULT 'SHARED',
  ADD COLUMN "whatsappSenderStatus" "WhatsappSenderStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
  ADD COLUMN "whatsappPhoneNumberId" TEXT,
  ADD COLUMN "whatsappWabaId" TEXT,
  ADD COLUMN "whatsappDisplayName" TEXT,
  ADD COLUMN "whatsappVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "whatsappTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN "whatsappLastVerifyError" TEXT;

CREATE UNIQUE INDEX "Clinic_whatsappPhoneNumberId_key" ON "Clinic"("whatsappPhoneNumberId");

CREATE TABLE "ClinicSecret" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "ciphertext" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rotatedAt" TIMESTAMP(3),

  CONSTRAINT "ClinicSecret_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClinicSecret_clinicId_kind_key" ON "ClinicSecret"("clinicId", "kind");
CREATE INDEX "ClinicSecret_clinicId_idx" ON "ClinicSecret"("clinicId");

ALTER TABLE "ClinicSecret"
  ADD CONSTRAINT "ClinicSecret_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WhatsappLog"
  ADD COLUMN "senderPhoneNumberId" TEXT,
  ADD COLUMN "senderMode" "WhatsappSenderMode" NOT NULL DEFAULT 'SHARED';

CREATE INDEX "WhatsappLog_senderPhoneNumberId_idx" ON "WhatsappLog"("senderPhoneNumberId");

ALTER TYPE "UsageType" ADD VALUE IF NOT EXISTS 'DOCTORS';
ALTER TYPE "UsageType" ADD VALUE IF NOT EXISTS 'CONSULTATIONS';
ALTER TYPE "UsageType" ADD VALUE IF NOT EXISTS 'PRESCRIPTIONS';
ALTER TYPE "UsageType" ADD VALUE IF NOT EXISTS 'INVOICES';

ALTER TABLE "EnterpriseContract"
  ADD COLUMN "includedDoctors" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "includedPrescriptions" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "includedInvoices" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "overageDoctorCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "overagePrescriptionCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "overageInvoiceCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "setupFeeCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "dedicatedSupportCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "customLineItems" JSONB NOT NULL DEFAULT '[]';
