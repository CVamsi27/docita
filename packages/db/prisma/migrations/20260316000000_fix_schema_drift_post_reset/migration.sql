-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'RESCHEDULING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "MetricValueType" AS ENUM ('STRING', 'NUMBER', 'BOOLEAN', 'DATE', 'JSON', 'SINGLE_SELECT', 'MULTI_SELECT');

-- CreateEnum
CREATE TYPE "MetricCardinality" AS ENUM ('SINGLE', 'MULTIPLE');

-- CreateEnum
CREATE TYPE "MetricCaptureScope" AS ENUM ('PROFILE', 'ENCOUNTER');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'PARTIALLY_PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "QueueTokenStatus" AS ENUM ('WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentSessionStatus" AS ENUM ('CREATED', 'PENDING', 'AUTHORIZED', 'CAPTURED', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WhatsappLogStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "OcrDocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "OnboardingStep" AS ENUM ('NOT_STARTED', 'CHOOSE_PATH', 'CREATING_CLINIC', 'JOINING_CLINIC', 'COMPLETED');

-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "UploadSessionPurpose" AS ENUM ('GENERAL', 'DOCTOR_SIGNATURE');

-- CreateEnum
CREATE TYPE "DoctorVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED', 'FAILED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'PATIENT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "StaffNotificationType" ADD VALUE 'MEMBER_JOIN_REQUEST';
ALTER TYPE "StaffNotificationType" ADD VALUE 'MEMBER_JOIN_APPROVED';
ALTER TYPE "StaffNotificationType" ADD VALUE 'MEMBER_JOIN_REJECTED';

-- DropIndex
DROP INDEX "Patient_version_idx";

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "status",
ADD COLUMN     "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED';

-- AlterTable
ALTER TABLE "Clinic" DROP COLUMN "subscriptionStatus",
ADD COLUMN     "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Consent" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "status",
ADD COLUMN     "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "OcrDocument" DROP COLUMN "status",
ADD COLUMN     "status" "OcrDocumentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "abhaAddress" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3);

ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- AlterTable
ALTER TABLE "PaymentSession" DROP COLUMN "status",
ADD COLUMN     "status" "PaymentSessionStatus" NOT NULL DEFAULT 'CREATED';

-- AlterTable
ALTER TABLE "QueueToken" DROP COLUMN "status",
ADD COLUMN     "status" "QueueTokenStatus" NOT NULL DEFAULT 'WAITING';

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "UploadSession" ADD COLUMN     "doctorId" TEXT,
ADD COLUMN     "purpose" "UploadSessionPurpose" NOT NULL DEFAULT 'GENERAL';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accountLockedUntil" TIMESTAMP(3),
ADD COLUMN     "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastFailedLoginAt" TIMESTAMP(3),
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingStartedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingStep" "OnboardingStep" DEFAULT 'NOT_STARTED',
ADD COLUMN     "passwordResetExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordResetToken" TEXT,
ADD COLUMN     "signatureUploadedAt" TIMESTAMP(3),
ADD COLUMN     "verificationCheckedAt" TIMESTAMP(3),
ADD COLUMN     "verificationData" JSONB,
ADD COLUMN     "verificationReason" TEXT,
ADD COLUMN     "verificationRef" TEXT,
ADD COLUMN     "verificationSource" TEXT,
ADD COLUMN     "verificationStatus" "DoctorVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';

-- AlterTable
ALTER TABLE "WhatsappLog" DROP COLUMN "status",
ADD COLUMN     "status" "WhatsappLogStatus" NOT NULL DEFAULT 'QUEUED';

-- AlterTable
ALTER TABLE "WhatsappMessage" ALTER COLUMN "status" SET DEFAULT 'SENT';

-- CreateTable
CREATE TABLE "MemberJoinRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "requestedRole" "Role" NOT NULL DEFAULT 'DOCTOR',
    "message" TEXT,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedByName" TEXT,
    "responseMessage" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "MemberJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricCategory" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricDefinition" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "valueType" "MetricValueType" NOT NULL,
    "unit" TEXT,
    "cardinality" "MetricCardinality" NOT NULL DEFAULT 'SINGLE',
    "scope" "MetricCaptureScope" NOT NULL DEFAULT 'PROFILE',
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "isPatientScoped" BOOLEAN NOT NULL DEFAULT false,
    "patientId" TEXT,
    "isTrackedByDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricOption" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientMetricRecord" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" TEXT,
    "source" "MetricRecordSource" NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientMetricRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientMetricValue" (
    "id" TEXT NOT NULL,
    "metricRecordId" TEXT NOT NULL,
    "valueString" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "valueBoolean" BOOLEAN,
    "valueDate" TIMESTAMP(3),
    "valueJson" JSONB,
    "optionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientMetricValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientMetricSelection" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "isTracked" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientMetricSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLogArchive" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLogArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappLogArchive" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT,
    "paymentSessionId" TEXT,
    "invoiceId" TEXT,
    "prescriptionId" TEXT,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestBody" JSONB,
    "responseBody" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappLogArchive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentArchive" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "notes" TEXT,
    "consultationNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clinicId" TEXT NOT NULL,
    "observations" TEXT,
    "chiefComplaint" TEXT,
    "treatmentHistory" TEXT,
    "clinicalImpression" TEXT,
    "differentialDiagnosis" TEXT,
    "finalDiagnosis" TEXT,
    "followUpPlan" TEXT,
    "generalExamination" JSONB,
    "historyOfPresentIllness" TEXT,
    "investigations" JSONB,
    "pastMedicalHistory" TEXT,
    "provisionalDiagnosis" TEXT,
    "reviewOfSystems" TEXT,
    "systemicExamination" JSONB,
    "treatmentPlan" TEXT,
    "dentalChart" JSONB,
    "growthData" JSONB,
    "ophthalmologyExam" JSONB,
    "cardiologyExam" JSONB,
    "gynecologyExam" JSONB,
    "dermatologyExam" JSONB,
    "psychiatryExam" JSONB,
    "encounterSummary" TEXT,
    "priority" "AppointmentPriority" NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberJoinRequest_clinicId_status_idx" ON "MemberJoinRequest"("clinicId", "status");

-- CreateIndex
CREATE INDEX "MemberJoinRequest_status_idx" ON "MemberJoinRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MemberJoinRequest_userId_clinicId_key" ON "MemberJoinRequest"("userId", "clinicId");

-- CreateIndex
CREATE INDEX "MetricCategory_clinicId_isActive_order_idx" ON "MetricCategory"("clinicId", "isActive", "order");

-- CreateIndex
CREATE UNIQUE INDEX "MetricCategory_clinicId_key_key" ON "MetricCategory"("clinicId", "key");

-- CreateIndex
CREATE INDEX "MetricDefinition_clinicId_categoryId_isActive_order_idx" ON "MetricDefinition"("clinicId", "categoryId", "isActive", "order");

-- CreateIndex
CREATE INDEX "MetricDefinition_patientId_isActive_idx" ON "MetricDefinition"("patientId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MetricDefinition_clinicId_key_key" ON "MetricDefinition"("clinicId", "key");

-- CreateIndex
CREATE INDEX "MetricOption_definitionId_isActive_order_idx" ON "MetricOption"("definitionId", "isActive", "order");

-- CreateIndex
CREATE UNIQUE INDEX "MetricOption_definitionId_value_key" ON "MetricOption"("definitionId", "value");

-- CreateIndex
CREATE INDEX "PatientMetricRecord_clinicId_patientId_recordedAt_idx" ON "PatientMetricRecord"("clinicId", "patientId", "recordedAt");

-- CreateIndex
CREATE INDEX "PatientMetricRecord_patientId_definitionId_recordedAt_idx" ON "PatientMetricRecord"("patientId", "definitionId", "recordedAt");

-- CreateIndex
CREATE INDEX "PatientMetricRecord_appointmentId_idx" ON "PatientMetricRecord"("appointmentId");

-- CreateIndex
CREATE INDEX "PatientMetricValue_metricRecordId_idx" ON "PatientMetricValue"("metricRecordId");

-- CreateIndex
CREATE INDEX "PatientMetricValue_optionId_idx" ON "PatientMetricValue"("optionId");

-- CreateIndex
CREATE INDEX "PatientMetricSelection_clinicId_patientId_isTracked_idx" ON "PatientMetricSelection"("clinicId", "patientId", "isTracked");

-- CreateIndex
CREATE UNIQUE INDEX "PatientMetricSelection_patientId_definitionId_key" ON "PatientMetricSelection"("patientId", "definitionId");

-- CreateIndex
CREATE INDEX "AuditLogArchive_clinicId_idx" ON "AuditLogArchive"("clinicId");

-- CreateIndex
CREATE INDEX "AuditLogArchive_entityId_idx" ON "AuditLogArchive"("entityId");

-- CreateIndex
CREATE INDEX "AuditLogArchive_createdAt_idx" ON "AuditLogArchive"("createdAt");

-- CreateIndex
CREATE INDEX "WhatsappLogArchive_clinicId_idx" ON "WhatsappLogArchive"("clinicId");

-- CreateIndex
CREATE INDEX "WhatsappLogArchive_phoneNumber_idx" ON "WhatsappLogArchive"("phoneNumber");

-- CreateIndex
CREATE INDEX "WhatsappLogArchive_createdAt_idx" ON "WhatsappLogArchive"("createdAt");

-- CreateIndex
CREATE INDEX "AppointmentArchive_clinicId_idx" ON "AppointmentArchive"("clinicId");

-- CreateIndex
CREATE INDEX "AppointmentArchive_patientId_idx" ON "AppointmentArchive"("patientId");

-- CreateIndex
CREATE INDEX "AppointmentArchive_doctorId_idx" ON "AppointmentArchive"("doctorId");

-- CreateIndex
CREATE INDEX "AppointmentArchive_startTime_idx" ON "AppointmentArchive"("startTime");

-- CreateIndex
CREATE INDEX "Appointment_status_startTime_idx" ON "Appointment"("status", "startTime");

-- CreateIndex
CREATE INDEX "Appointment_clinicId_status_startTime_idx" ON "Appointment"("clinicId", "status", "startTime");

-- CreateIndex
CREATE INDEX "Invoice_status_createdAt_idx" ON "Invoice"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "OcrDocument_status_idx" ON "OcrDocument"("status");

-- CreateIndex
CREATE INDEX "Patient_deletedAt_idx" ON "Patient"("deletedAt");

-- CreateIndex
CREATE INDEX "Patient_abhaAddress_idx" ON "Patient"("abhaAddress");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Patient_userId_idx" ON "Patient"("userId");

-- CreateIndex
CREATE INDEX "PaymentSession_status_idx" ON "PaymentSession"("status");

-- CreateIndex
CREATE INDEX "QueueToken_status_idx" ON "QueueToken"("status");

-- CreateIndex
CREATE INDEX "QueueToken_clinicId_status_createdAt_idx" ON "QueueToken"("clinicId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "QueueToken_doctorId_status_idx" ON "QueueToken"("doctorId", "status");

-- CreateIndex
CREATE INDEX "UploadSession_doctorId_idx" ON "UploadSession"("doctorId");

-- CreateIndex
CREATE UNIQUE INDEX "User_passwordResetToken_key" ON "User"("passwordResetToken");

-- CreateIndex
CREATE INDEX "WhatsappLog_status_idx" ON "WhatsappLog"("status");

-- AddForeignKey
ALTER TABLE "MemberJoinRequest" ADD CONSTRAINT "MemberJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberJoinRequest" ADD CONSTRAINT "MemberJoinRequest_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberJoinRequest" ADD CONSTRAINT "MemberJoinRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadSession" ADD CONSTRAINT "UploadSession_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricCategory" ADD CONSTRAINT "MetricCategory_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricDefinition" ADD CONSTRAINT "MetricDefinition_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MetricCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricDefinition" ADD CONSTRAINT "MetricDefinition_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricDefinition" ADD CONSTRAINT "MetricDefinition_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Patient_userId_fkey'
  ) THEN
    ALTER TABLE "Patient"
      ADD CONSTRAINT "Patient_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
ALTER TABLE "MetricOption" ADD CONSTRAINT "MetricOption_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "MetricDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMetricRecord" ADD CONSTRAINT "PatientMetricRecord_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMetricRecord" ADD CONSTRAINT "PatientMetricRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMetricRecord" ADD CONSTRAINT "PatientMetricRecord_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "MetricDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMetricRecord" ADD CONSTRAINT "PatientMetricRecord_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMetricRecord" ADD CONSTRAINT "PatientMetricRecord_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMetricValue" ADD CONSTRAINT "PatientMetricValue_metricRecordId_fkey" FOREIGN KEY ("metricRecordId") REFERENCES "PatientMetricRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMetricValue" ADD CONSTRAINT "PatientMetricValue_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "MetricOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMetricSelection" ADD CONSTRAINT "PatientMetricSelection_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMetricSelection" ADD CONSTRAINT "PatientMetricSelection_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientMetricSelection" ADD CONSTRAINT "PatientMetricSelection_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "MetricDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
