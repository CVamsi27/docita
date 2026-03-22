-- Migration: Signature Unification, Dynamic Pricing & Tier Restructure

-- 1. Add SignaturePurpose enum
CREATE TYPE "SignaturePurpose" AS ENUM ('DOCTOR_PRESCRIPTION', 'SLA_ACCEPTANCE');

-- 2. Add CLINIC to ClinicTier enum
ALTER TYPE "ClinicTier" ADD VALUE 'CLINIC';

-- 3. Add new UsageType values
ALTER TYPE "UsageType" ADD VALUE 'PRESCRIPTION';
ALTER TYPE "UsageType" ADD VALUE 'INVOICE';
ALTER TYPE "UsageType" ADD VALUE 'OCR_PAGE';
ALTER TYPE "UsageType" ADD VALUE 'API_CALL';

-- 4. Extend SignatureUploadToken
ALTER TABLE "SignatureUploadToken" ADD COLUMN "purpose" "SignaturePurpose" NOT NULL DEFAULT 'DOCTOR_PRESCRIPTION';
ALTER TABLE "SignatureUploadToken" ALTER COLUMN "doctorId" DROP NOT NULL;
ALTER TABLE "SignatureUploadToken" ADD COLUMN "clinicId" TEXT;

-- Add foreign key for clinicId
ALTER TABLE "SignatureUploadToken" ADD CONSTRAINT "SignatureUploadToken_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "SignatureUploadToken_clinicId_idx" ON "SignatureUploadToken"("clinicId");

-- 5. Add SLA signature fields to Clinic
ALTER TABLE "Clinic" ADD COLUMN "slaSignatureUrl" TEXT;
ALTER TABLE "Clinic" ADD COLUMN "slaSignatureAcceptedAt" TIMESTAMP(3);

-- 6. Add new overage fields to TierPricing
ALTER TABLE "TierPricing" ADD COLUMN "overagePrescriptionCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TierPricing" ADD COLUMN "overageInvoiceCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TierPricing" ADD COLUMN "overageOcrPageCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "TierPricing" ADD COLUMN "overageApiCallCents" INTEGER NOT NULL DEFAULT 0;
