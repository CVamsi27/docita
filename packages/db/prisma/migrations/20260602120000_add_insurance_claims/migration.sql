-- Additive insurance claim lifecycle tracking for manual Indian cashless
-- pre-authorization and reimbursement workflows.

CREATE TYPE "ClaimType" AS ENUM ('PRE_AUTH', 'REIMBURSEMENT');
CREATE TYPE "ClaimStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'INFO_REQUESTED',
  'APPROVED',
  'PARTIALLY_APPROVED',
  'DENIED',
  'SETTLED',
  'CANCELLED',
  'APPEALED'
);

CREATE TABLE "InsuranceClaim" (
  "id" TEXT NOT NULL,
  "claimNumber" TEXT,
  "claimType" "ClaimType" NOT NULL,
  "status" "ClaimStatus" NOT NULL DEFAULT 'DRAFT',
  "patientId" TEXT NOT NULL,
  "clinicId" TEXT,
  "appointmentId" TEXT,
  "invoiceId" TEXT,
  "parentClaimId" TEXT,
  "insurerName" TEXT NOT NULL,
  "tpaName" TEXT,
  "policyNumber" TEXT NOT NULL,
  "groupNumber" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'INR',
  "claimedAmountCents" INTEGER NOT NULL DEFAULT 0,
  "approvedAmountCents" INTEGER,
  "patientResponsibilityCents" INTEGER,
  "submittedAt" timestamptz(3),
  "respondedAt" timestamptz(3),
  "settledAt" timestamptz(3),
  "notes" TEXT,
  "denialReason" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "idempotencyKey" TEXT,
  "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz(3) NOT NULL,

  CONSTRAINT "InsuranceClaim_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InsuranceClaimEvent" (
  "id" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "fromStatus" "ClaimStatus",
  "toStatus" "ClaimStatus" NOT NULL,
  "actorUserId" TEXT,
  "note" TEXT,
  "amountCents" INTEGER,
  "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "InsuranceClaimEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Document" ADD COLUMN "insuranceClaimId" TEXT;
ALTER TABLE "Patient"
  ADD COLUMN "insuranceProvider" TEXT,
  ADD COLUMN "insurancePolicyNumber" TEXT,
  ADD COLUMN "insuranceGroupNumber" TEXT;

CREATE UNIQUE INDEX "InsuranceClaim_idempotencyKey_key"
  ON "InsuranceClaim"("idempotencyKey");
CREATE UNIQUE INDEX "InsuranceClaim_clinicId_claimNumber_key"
  ON "InsuranceClaim"("clinicId", "claimNumber");
CREATE INDEX "InsuranceClaim_clinicId_idx" ON "InsuranceClaim"("clinicId");
CREATE INDEX "InsuranceClaim_clinicId_status_createdAt_desc_idx"
  ON "InsuranceClaim"("clinicId", "status", "createdAt" DESC);
CREATE INDEX "InsuranceClaim_patientId_idx" ON "InsuranceClaim"("patientId");
CREATE INDEX "InsuranceClaim_invoiceId_idx" ON "InsuranceClaim"("invoiceId");
CREATE INDEX "InsuranceClaim_appointmentId_idx" ON "InsuranceClaim"("appointmentId");
CREATE INDEX "InsuranceClaim_createdAt_idx" ON "InsuranceClaim"("createdAt");
CREATE INDEX "InsuranceClaimEvent_claimId_idx" ON "InsuranceClaimEvent"("claimId");
CREATE INDEX "InsuranceClaimEvent_createdAt_idx" ON "InsuranceClaimEvent"("createdAt");
CREATE INDEX "Document_insuranceClaimId_idx" ON "Document"("insuranceClaimId");

ALTER TABLE "InsuranceClaim"
  ADD CONSTRAINT "InsuranceClaim_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaim"
  ADD CONSTRAINT "InsuranceClaim_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaim"
  ADD CONSTRAINT "InsuranceClaim_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaim"
  ADD CONSTRAINT "InsuranceClaim_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaim"
  ADD CONSTRAINT "InsuranceClaim_parentClaimId_fkey"
  FOREIGN KEY ("parentClaimId") REFERENCES "InsuranceClaim"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "InsuranceClaimEvent"
  ADD CONSTRAINT "InsuranceClaimEvent_claimId_fkey"
  FOREIGN KEY ("claimId") REFERENCES "InsuranceClaim"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Document"
  ADD CONSTRAINT "Document_insuranceClaimId_fkey"
  FOREIGN KEY ("insuranceClaimId") REFERENCES "InsuranceClaim"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
