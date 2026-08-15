-- CreateEnum
CREATE TYPE "FacilityLeadType" AS ENUM ('CLINIC', 'HOSPITAL', 'DIAGNOSTIC_CENTRE', 'PHARMACY', 'NURSING_HOME', 'OTHER');

-- CreateEnum
CREATE TYPE "FacilityLeadStatus" AS ENUM ('SUBMITTED', 'TRIAGED', 'CONTACT_ATTEMPTED', 'CONTACTED', 'DEMO_SCHEDULED', 'ONBOARDING', 'TRIAL', 'CONVERTED', 'DUPLICATE', 'NOT_INTERESTED', 'INVALID', 'UNREACHABLE', 'REJECTED', 'LOST');

-- CreateTable
CREATE TABLE "FacilityLead" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "status" "FacilityLeadStatus" NOT NULL DEFAULT 'SUBMITTED',
    "facilityName" TEXT NOT NULL,
    "facilityType" "FacilityLeadType" NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "postalCode" TEXT,
    "mapsUrl" TEXT,
    "contactName" TEXT NOT NULL,
    "contactRole" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "sourceNote" TEXT,
    "preferredChannel" TEXT,
    "consentToFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "bestTimeToContact" TEXT,
    "idempotencyKey" TEXT,
    "statusHistory" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "FacilityLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FacilityLead_status_createdAt_idx" ON "FacilityLead"("status", "createdAt");

-- CreateIndex
CREATE INDEX "FacilityLead_referrerId_idx" ON "FacilityLead"("referrerId");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityLead_referrerId_idempotencyKey_key" ON "FacilityLead"("referrerId", "idempotencyKey");

-- AddForeignKey
ALTER TABLE "FacilityLead" ADD CONSTRAINT "FacilityLead_referrerId_fkey" FOREIGN KEY ("referrerId") REFERENCES "Referrer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
