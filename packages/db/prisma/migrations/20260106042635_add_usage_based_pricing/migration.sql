/*
  Warnings:

  - You are about to drop the column `priceCents` on the `Subscription` table. All the data in the column will be lost.
  - Added the required column `basePriceCents` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AddOnType" AS ENUM ('WHATSAPP', 'INTELLIGENCE');

-- CreateEnum
CREATE TYPE "AddOnStatus" AS ENUM ('ACTIVE', 'TRIALING', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "UsageType" AS ENUM ('ACTIVE_PATIENTS', 'APPOINTMENTS', 'STORAGE_GB', 'USERS', 'WHATSAPP_MESSAGES', 'AI_CREDITS');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('ANNUAL_COMMITMENT', 'SEMI_ANNUAL_COMMITMENT', 'LOYALTY_1_YEAR', 'LOYALTY_2_YEARS', 'LOYALTY_3_YEARS', 'REFERRAL_NEW_CUSTOMER', 'GOVERNMENT', 'NGO', 'MEDICAL_COLLEGE', 'RURAL_HEALTH', 'STARTUP_CLINIC');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BillingCycle" ADD VALUE 'QUARTERLY';
ALTER TYPE "BillingCycle" ADD VALUE 'SEMI_ANNUAL';

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "priceCents",
ADD COLUMN     "basePriceCents" INTEGER NOT NULL,
ADD COLUMN     "discountsApplied" JSONB,
ADD COLUMN     "includedAppointments" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN     "includedPatients" INTEGER NOT NULL DEFAULT 300,
ADD COLUMN     "includedStorageGB" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "includedUsers" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "totalDiscountPercent" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "TierPricing" (
    "id" TEXT NOT NULL,
    "tier" "ClinicTier" NOT NULL,
    "monthlyBasePriceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "includedPatients" INTEGER NOT NULL,
    "includedAppointments" INTEGER NOT NULL,
    "includedStorageGB" INTEGER NOT NULL,
    "includedUsers" INTEGER NOT NULL,
    "overagePatientCents" INTEGER NOT NULL,
    "overageAppointmentCents" INTEGER NOT NULL,
    "overageStorageCents" INTEGER NOT NULL,
    "overageUserCents" INTEGER NOT NULL,
    "features" JSONB NOT NULL DEFAULT '[]',
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tagline" TEXT,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TierPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddOn" (
    "id" TEXT NOT NULL,
    "type" "AddOnType" NOT NULL,
    "pricingByTier" JSONB NOT NULL,
    "includedQuotaByTier" JSONB NOT NULL,
    "overageRateByTier" JSONB NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "features" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicAddOn" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "addOnId" TEXT NOT NULL,
    "addOnType" "AddOnType" NOT NULL,
    "status" "AddOnStatus" NOT NULL DEFAULT 'ACTIVE',
    "priceCents" INTEGER NOT NULL,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "razorpaySubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicAddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "type" "UsageType" NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "includedQuota" INTEGER NOT NULL,
    "overageUnits" INTEGER NOT NULL,
    "overageChargeCents" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageEvent" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "type" "UsageType" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entityType" TEXT,
    "entityId" TEXT,
    "eventKey" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discount" (
    "id" TEXT NOT NULL,
    "type" "DiscountType" NOT NULL,
    "percentOff" INTEGER NOT NULL,
    "maxCombinedPercent" INTEGER,
    "appliesToBase" BOOLEAN NOT NULL DEFAULT true,
    "appliesToAddOns" BOOLEAN NOT NULL DEFAULT true,
    "appliesToOverage" BOOLEAN NOT NULL DEFAULT false,
    "minCommitmentMonths" INTEGER,
    "minTenureMonths" INTEGER,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "badgeText" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TierPricing_tier_key" ON "TierPricing"("tier");

-- CreateIndex
CREATE INDEX "TierPricing_isActive_idx" ON "TierPricing"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AddOn_type_key" ON "AddOn"("type");

-- CreateIndex
CREATE INDEX "AddOn_isActive_idx" ON "AddOn"("isActive");

-- CreateIndex
CREATE INDEX "ClinicAddOn_clinicId_idx" ON "ClinicAddOn"("clinicId");

-- CreateIndex
CREATE INDEX "ClinicAddOn_addOnId_idx" ON "ClinicAddOn"("addOnId");

-- CreateIndex
CREATE INDEX "ClinicAddOn_status_idx" ON "ClinicAddOn"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicAddOn_clinicId_addOnType_key" ON "ClinicAddOn"("clinicId", "addOnType");

-- CreateIndex
CREATE INDEX "UsageRecord_clinicId_idx" ON "UsageRecord"("clinicId");

-- CreateIndex
CREATE INDEX "UsageRecord_type_idx" ON "UsageRecord"("type");

-- CreateIndex
CREATE INDEX "UsageRecord_periodStart_idx" ON "UsageRecord"("periodStart");

-- CreateIndex
CREATE INDEX "UsageRecord_clinicId_periodStart_idx" ON "UsageRecord"("clinicId", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "UsageRecord_clinicId_type_periodStart_key" ON "UsageRecord"("clinicId", "type", "periodStart");

-- CreateIndex
CREATE INDEX "UsageEvent_clinicId_idx" ON "UsageEvent"("clinicId");

-- CreateIndex
CREATE INDEX "UsageEvent_type_idx" ON "UsageEvent"("type");

-- CreateIndex
CREATE INDEX "UsageEvent_timestamp_idx" ON "UsageEvent"("timestamp");

-- CreateIndex
CREATE INDEX "UsageEvent_clinicId_type_timestamp_idx" ON "UsageEvent"("clinicId", "type", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "UsageEvent_eventKey_key" ON "UsageEvent"("eventKey");

-- CreateIndex
CREATE UNIQUE INDEX "Discount_type_key" ON "Discount"("type");

-- CreateIndex
CREATE INDEX "Discount_isActive_idx" ON "Discount"("isActive");

-- CreateIndex
CREATE INDEX "Discount_type_idx" ON "Discount"("type");

-- AddForeignKey
ALTER TABLE "ClinicAddOn" ADD CONSTRAINT "ClinicAddOn_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicAddOn" ADD CONSTRAINT "ClinicAddOn_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "AddOn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
