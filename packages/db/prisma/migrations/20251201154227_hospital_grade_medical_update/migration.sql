/*
  Warnings:

  - A unique constraint covering the columns `[mrn]` on the table `Patient` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CodeStatus" AS ENUM ('FULL_CODE', 'DNR', 'DNI', 'DNR_DNI', 'COMFORT_CARE');

-- CreateEnum
CREATE TYPE "BpPosition" AS ENUM ('SITTING', 'STANDING', 'LYING', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "OxygenDelivery" AS ENUM ('ROOM_AIR', 'NASAL_CANNULA', 'SIMPLE_MASK', 'NON_REBREATHER', 'VENTURI_MASK', 'HIGH_FLOW', 'CPAP', 'BIPAP', 'VENTILATOR', 'OTHER');

-- CreateEnum
CREATE TYPE "BpMigrationStatus" AS ENUM ('PENDING', 'MIGRATED', 'FLAGGED', 'MANUAL');

-- CreateEnum
CREATE TYPE "DosageForm" AS ENUM ('TABLET', 'CAPSULE', 'SOLUTION', 'SUSPENSION', 'INJECTION', 'CREAM', 'OINTMENT', 'GEL', 'PATCH', 'INHALER', 'NEBULIZER', 'SUPPOSITORY', 'DROPS', 'SPRAY', 'POWDER', 'LOZENGE', 'FILM', 'OTHER');

-- CreateEnum
CREATE TYPE "SigCode" AS ENUM ('QD', 'BID', 'TID', 'QID', 'Q4H', 'Q6H', 'Q8H', 'Q12H', 'QHS', 'QAM', 'QPM', 'QOD', 'QWK', 'PRN', 'STAT', 'AC', 'PC', 'OTHER');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('TREATMENT', 'PROCEDURE', 'SURGERY', 'ANESTHESIA', 'HIPAA_RELEASE', 'RESEARCH', 'PHOTO_VIDEO', 'TELEHEALTH', 'MINOR_GUARDIAN', 'BLOOD_TRANSFUSION', 'VACCINATION');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED', 'PENDING');

-- CreateEnum
CREATE TYPE "ImmunizationRoute" AS ENUM ('IM', 'SC', 'ID', 'PO', 'IN', 'OTHER');

-- CreateEnum
CREATE TYPE "ImmunizationSite" AS ENUM ('LEFT_ARM', 'RIGHT_ARM', 'LEFT_THIGH', 'RIGHT_THIGH', 'LEFT_DELTOID', 'RIGHT_DELTOID', 'OTHER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "Gender" ADD VALUE 'INTERSEX';
ALTER TYPE "Gender" ADD VALUE 'NON_BINARY';
ALTER TYPE "Gender" ADD VALUE 'PREFER_NOT_TO_SAY';

-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "mrnPrefix" TEXT;

-- AlterTable
ALTER TABLE "LabTest" ADD COLUMN     "collectionRequirements" TEXT,
ADD COLUMN     "loincCode" TEXT,
ADD COLUMN     "referenceRangeHigh" DOUBLE PRECISION,
ADD COLUMN     "referenceRangeLow" DOUBLE PRECISION,
ADD COLUMN     "referenceRangeText" TEXT,
ADD COLUMN     "referenceRangeUnit" TEXT,
ADD COLUMN     "specimenType" TEXT;

-- AlterTable
ALTER TABLE "Medication" ADD COLUMN     "dispenseAsWritten" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dosageForm" "DosageForm",
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "indication" TEXT,
ADD COLUMN     "isPRN" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "ndcCode" TEXT,
ADD COLUMN     "prnInstructions" TEXT,
ADD COLUMN     "prnMaxDose" TEXT,
ADD COLUMN     "quantity" INTEGER,
ADD COLUMN     "refillsAllowed" INTEGER DEFAULT 0,
ADD COLUMN     "rxNormCui" TEXT,
ADD COLUMN     "sigCode" "SigCode",
ADD COLUMN     "specialInstructions" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "strengthUnit" TEXT,
ADD COLUMN     "strengthValue" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "advanceDirectiveUrl" TEXT,
ADD COLUMN     "codeStatus" "CodeStatus" NOT NULL DEFAULT 'FULL_CODE',
ADD COLUMN     "codeStatusUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "codeStatusUpdatedBy" TEXT,
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "emergencyContactRelation" TEXT,
ADD COLUMN     "ethnicity" TEXT,
ADD COLUMN     "maritalStatus" TEXT,
ADD COLUMN     "mrn" TEXT,
ADD COLUMN     "preferredLanguage" TEXT DEFAULT 'en',
ADD COLUMN     "preferredName" TEXT,
ADD COLUMN     "pronouns" TEXT,
ADD COLUMN     "race" TEXT;

-- AlterTable
ALTER TABLE "VitalSign" ADD COLUMN     "bpMigrationStatus" "BpMigrationStatus",
ADD COLUMN     "bpPosition" "BpPosition",
ADD COLUMN     "diastolicBP" INTEGER,
ADD COLUMN     "headCircumference" DOUBLE PRECISION,
ADD COLUMN     "oxygenDelivery" "OxygenDelivery",
ADD COLUMN     "oxygenFlowRate" DOUBLE PRECISION,
ADD COLUMN     "systolicBP" INTEGER,
ADD COLUMN     "waistCircumference" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "LoincCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "longName" TEXT NOT NULL,
    "shortName" TEXT,
    "component" TEXT,
    "property" TEXT,
    "timeAspect" TEXT,
    "system" TEXT,
    "scale" TEXT,
    "method" TEXT,
    "classType" TEXT,
    "status" TEXT DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoincCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Immunization" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "vaccineName" TEXT NOT NULL,
    "cvxCode" TEXT,
    "mvxCode" TEXT,
    "ndcCode" TEXT,
    "manufacturer" TEXT,
    "lotNumber" TEXT,
    "expirationDate" TIMESTAMP(3),
    "administeredDate" TIMESTAMP(3) NOT NULL,
    "administeredBy" TEXT,
    "administeredAt" TEXT,
    "site" "ImmunizationSite",
    "route" "ImmunizationRoute",
    "doseNumber" INTEGER,
    "seriesComplete" BOOLEAN,
    "informationSource" TEXT,
    "notes" TEXT,
    "documentUrl" TEXT,
    "hadReaction" BOOLEAN NOT NULL DEFAULT false,
    "reactionDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Immunization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "consentType" "ConsentType" NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'PENDING',
    "givenBy" TEXT,
    "givenByRelation" TEXT,
    "givenAt" TIMESTAMP(3),
    "witnessedBy" TEXT,
    "witnessedAt" TIMESTAMP(3),
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "revokedReason" TEXT,
    "procedureId" TEXT,
    "procedureName" TEXT,
    "documentUrl" TEXT,
    "templateVersion" TEXT,
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MrnSequence" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MrnSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LoincCode_code_key" ON "LoincCode"("code");

-- CreateIndex
CREATE INDEX "LoincCode_code_idx" ON "LoincCode"("code");

-- CreateIndex
CREATE INDEX "LoincCode_component_idx" ON "LoincCode"("component");

-- CreateIndex
CREATE INDEX "LoincCode_classType_idx" ON "LoincCode"("classType");

-- CreateIndex
CREATE INDEX "Immunization_patientId_idx" ON "Immunization"("patientId");

-- CreateIndex
CREATE INDEX "Immunization_cvxCode_idx" ON "Immunization"("cvxCode");

-- CreateIndex
CREATE INDEX "Immunization_administeredDate_idx" ON "Immunization"("administeredDate");

-- CreateIndex
CREATE INDEX "Consent_patientId_idx" ON "Consent"("patientId");

-- CreateIndex
CREATE INDEX "Consent_clinicId_idx" ON "Consent"("clinicId");

-- CreateIndex
CREATE INDEX "Consent_consentType_idx" ON "Consent"("consentType");

-- CreateIndex
CREATE INDEX "Consent_status_idx" ON "Consent"("status");

-- CreateIndex
CREATE INDEX "Consent_validUntil_idx" ON "Consent"("validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "MrnSequence_clinicId_key" ON "MrnSequence"("clinicId");

-- CreateIndex
CREATE INDEX "MrnSequence_clinicId_idx" ON "MrnSequence"("clinicId");

-- CreateIndex
CREATE INDEX "LabTest_loincCode_idx" ON "LabTest"("loincCode");

-- CreateIndex
CREATE INDEX "Medication_ndcCode_idx" ON "Medication"("ndcCode");

-- CreateIndex
CREATE INDEX "Medication_rxNormCui_idx" ON "Medication"("rxNormCui");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_mrn_key" ON "Patient"("mrn");

-- CreateIndex
CREATE INDEX "Patient_mrn_idx" ON "Patient"("mrn");

-- CreateIndex
CREATE INDEX "Patient_codeStatus_idx" ON "Patient"("codeStatus");

-- CreateIndex
CREATE INDEX "VitalSign_bpMigrationStatus_idx" ON "VitalSign"("bpMigrationStatus");

-- AddForeignKey
ALTER TABLE "LabTest" ADD CONSTRAINT "LabTest_loincCode_fkey" FOREIGN KEY ("loincCode") REFERENCES "LoincCode"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Immunization" ADD CONSTRAINT "Immunization_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MrnSequence" ADD CONSTRAINT "MrnSequence_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
