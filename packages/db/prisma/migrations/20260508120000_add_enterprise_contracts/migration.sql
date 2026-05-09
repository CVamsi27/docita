-- Adds Enterprise contract tables (additive only).
-- Per-clinic OR per-clinic-group negotiated pricing for ENTERPRISE tier:
-- platform fee + included quotas + overage rates. Replaces the
-- "Contact Sales" placeholder with real numbers used by the overage
-- scheduler and pricing service. Supports multi-clinic group contracts
-- via EnterpriseContractMember; the contract row's primaryClinicId is
-- the billing entity. Annual prepay invoices and true-up alerts persist
-- their state in EnterpriseContractInvoice and EnterpriseTrueUpAlert.

CREATE TYPE "EnterpriseContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED');
CREATE TYPE "EnterpriseInvoiceKind" AS ENUM ('ANNUAL_PREPAY', 'TRUE_UP', 'ADJUSTMENT');

CREATE TABLE "EnterpriseContract" (
    "id" TEXT NOT NULL,
    "primaryClinicId" TEXT NOT NULL,
    "groupName" TEXT,
    "contractNumber" TEXT NOT NULL,
    "status" "EnterpriseContractStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "platformFeeCents" INTEGER NOT NULL,
    "includedUsers" INTEGER NOT NULL DEFAULT 0,
    "includedConsultations" INTEGER NOT NULL DEFAULT 0,
    "includedWhatsappMessages" INTEGER NOT NULL DEFAULT 0,
    "includedStorageGB" INTEGER NOT NULL DEFAULT 0,
    "includedBranches" INTEGER NOT NULL DEFAULT 1,
    "overageUserCents" INTEGER NOT NULL DEFAULT 0,
    "overageConsultationCents" INTEGER NOT NULL DEFAULT 0,
    "overageWhatsappCents" INTEGER NOT NULL DEFAULT 0,
    "overageStorageCents" INTEGER NOT NULL DEFAULT 0,
    "annualPrepayDiscountPercent" INTEGER NOT NULL DEFAULT 0,
    "trueUpThresholdPercent" INTEGER NOT NULL DEFAULT 130,
    "notes" TEXT,
    "signedDocumentUrl" TEXT,
    "lastTrueUpAlertAt" TIMESTAMP(3),
    "annualPrepayInvoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseContract_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EnterpriseContract_contractNumber_key" ON "EnterpriseContract"("contractNumber");
CREATE INDEX "EnterpriseContract_primaryClinicId_idx" ON "EnterpriseContract"("primaryClinicId");
CREATE INDEX "EnterpriseContract_status_idx" ON "EnterpriseContract"("status");
CREATE INDEX "EnterpriseContract_endDate_idx" ON "EnterpriseContract"("endDate");

ALTER TABLE "EnterpriseContract"
  ADD CONSTRAINT "EnterpriseContract_primaryClinicId_fkey"
  FOREIGN KEY ("primaryClinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "EnterpriseContractMember" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "EnterpriseContractMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EnterpriseContractMember_clinicId_key" ON "EnterpriseContractMember"("clinicId");
CREATE INDEX "EnterpriseContractMember_contractId_idx" ON "EnterpriseContractMember"("contractId");

ALTER TABLE "EnterpriseContractMember"
  ADD CONSTRAINT "EnterpriseContractMember_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "EnterpriseContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EnterpriseContractMember"
  ADD CONSTRAINT "EnterpriseContractMember_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EnterpriseContractRevision" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "changeSummary" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnterpriseContractRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EnterpriseContractRevision_contractId_idx" ON "EnterpriseContractRevision"("contractId");
CREATE INDEX "EnterpriseContractRevision_effectiveDate_idx" ON "EnterpriseContractRevision"("effectiveDate");

ALTER TABLE "EnterpriseContractRevision"
  ADD CONSTRAINT "EnterpriseContractRevision_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "EnterpriseContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EnterpriseContractInvoice" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "kind" "EnterpriseInvoiceKind" NOT NULL,
    "subscriptionPaymentId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "discountPercent" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnterpriseContractInvoice_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EnterpriseContractInvoice_contractId_idx" ON "EnterpriseContractInvoice"("contractId");
CREATE INDEX "EnterpriseContractInvoice_kind_idx" ON "EnterpriseContractInvoice"("kind");
CREATE UNIQUE INDEX "EnterpriseContractInvoice_subscriptionPaymentId_key" ON "EnterpriseContractInvoice"("subscriptionPaymentId");

ALTER TABLE "EnterpriseContractInvoice"
  ADD CONSTRAINT "EnterpriseContractInvoice_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "EnterpriseContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EnterpriseContractInvoice"
  ADD CONSTRAINT "EnterpriseContractInvoice_subscriptionPaymentId_fkey"
  FOREIGN KEY ("subscriptionPaymentId") REFERENCES "SubscriptionPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "EnterpriseTrueUpAlert" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "alertedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "thresholdPercent" INTEGER NOT NULL,
    "observedPercent" INTEGER NOT NULL,
    "ytdOverageCents" INTEGER NOT NULL,
    "ytdPlatformCents" INTEGER NOT NULL,
    "recipients" TEXT[] NOT NULL DEFAULT '{}',
    "metadata" JSONB,

    CONSTRAINT "EnterpriseTrueUpAlert_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EnterpriseTrueUpAlert_contractId_idx" ON "EnterpriseTrueUpAlert"("contractId");
CREATE INDEX "EnterpriseTrueUpAlert_alertedAt_idx" ON "EnterpriseTrueUpAlert"("alertedAt");

ALTER TABLE "EnterpriseTrueUpAlert"
  ADD CONSTRAINT "EnterpriseTrueUpAlert_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "EnterpriseContract"("id") ON DELETE CASCADE ON UPDATE CASCADE;
