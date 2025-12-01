-- CreateEnum
CREATE TYPE "MedicalConditionType" AS ENUM ('CHRONIC', 'ACUTE', 'CONGENITAL', 'INFECTIOUS', 'AUTOIMMUNE', 'PSYCHIATRIC', 'OTHER');

-- CreateEnum
CREATE TYPE "ConditionStatus" AS ENUM ('ACTIVE', 'MANAGED', 'RESOLVED', 'IN_REMISSION');

-- CreateEnum
CREATE TYPE "ConditionSeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ConditionSourceType" AS ENUM ('MANUAL', 'AUTO_SUGGESTED', 'IMPORTED');

-- CreateEnum
CREATE TYPE "AllergyType" AS ENUM ('DRUG', 'FOOD', 'ENVIRONMENTAL', 'LATEX', 'INSECT', 'CONTRAST', 'OTHER');

-- CreateEnum
CREATE TYPE "AllergySeverity" AS ENUM ('MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING');

-- CreateEnum
CREATE TYPE "SmokingStatus" AS ENUM ('NEVER', 'FORMER', 'CURRENT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AlcoholUseStatus" AS ENUM ('NONE', 'OCCASIONAL', 'MODERATE', 'HEAVY', 'UNKNOWN');

-- CreateTable
CREATE TABLE "PatientMedicalCondition" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "conditionName" TEXT NOT NULL,
    "icdCode" TEXT,
    "conditionType" "MedicalConditionType" NOT NULL DEFAULT 'CHRONIC',
    "status" "ConditionStatus" NOT NULL DEFAULT 'ACTIVE',
    "severity" "ConditionSeverity",
    "diagnosedDate" TIMESTAMP(3),
    "resolvedDate" TIMESTAMP(3),
    "diagnosedBy" TEXT,
    "notes" TEXT,
    "sourceType" "ConditionSourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceAppointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientMedicalCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientAllergy" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "allergen" TEXT NOT NULL,
    "allergyType" "AllergyType" NOT NULL DEFAULT 'DRUG',
    "severity" "AllergySeverity" NOT NULL DEFAULT 'MODERATE',
    "reaction" TEXT,
    "onsetDate" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientAllergy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientFamilyHistory" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "ageAtOnset" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientFamilyHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientSocialHistory" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "smokingStatus" "SmokingStatus",
    "smokingPackYears" DOUBLE PRECISION,
    "smokingQuitDate" TIMESTAMP(3),
    "alcoholUse" "AlcoholUseStatus",
    "alcoholFrequency" TEXT,
    "substanceUse" TEXT,
    "occupation" TEXT,
    "occupationalHazards" TEXT,
    "exerciseFrequency" TEXT,
    "dietaryRestrictions" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientSocialHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientSurgicalHistory" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "procedureName" TEXT NOT NULL,
    "procedureDate" TIMESTAMP(3),
    "hospital" TEXT,
    "surgeon" TEXT,
    "complications" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientSurgicalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatientMedicalCondition_patientId_idx" ON "PatientMedicalCondition"("patientId");

-- CreateIndex
CREATE INDEX "PatientMedicalCondition_conditionType_idx" ON "PatientMedicalCondition"("conditionType");

-- CreateIndex
CREATE INDEX "PatientMedicalCondition_status_idx" ON "PatientMedicalCondition"("status");

-- CreateIndex
CREATE INDEX "PatientMedicalCondition_icdCode_idx" ON "PatientMedicalCondition"("icdCode");

-- CreateIndex
CREATE INDEX "PatientAllergy_patientId_idx" ON "PatientAllergy"("patientId");

-- CreateIndex
CREATE INDEX "PatientAllergy_allergyType_idx" ON "PatientAllergy"("allergyType");

-- CreateIndex
CREATE INDEX "PatientAllergy_severity_idx" ON "PatientAllergy"("severity");

-- CreateIndex
CREATE INDEX "PatientFamilyHistory_patientId_idx" ON "PatientFamilyHistory"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "PatientSocialHistory_patientId_key" ON "PatientSocialHistory"("patientId");

-- CreateIndex
CREATE INDEX "PatientSurgicalHistory_patientId_idx" ON "PatientSurgicalHistory"("patientId");

-- AddForeignKey
ALTER TABLE "PatientMedicalCondition" ADD CONSTRAINT "PatientMedicalCondition_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAllergy" ADD CONSTRAINT "PatientAllergy_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientFamilyHistory" ADD CONSTRAINT "PatientFamilyHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientSocialHistory" ADD CONSTRAINT "PatientSocialHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientSurgicalHistory" ADD CONSTRAINT "PatientSurgicalHistory_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
