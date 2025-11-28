/*
  Warnings:

  - The values [FREE,STARTER,PROFESSIONAL] on the enum `ClinicTier` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "IntelligenceAddon" AS ENUM ('NONE', 'ACTIVE');

-- CreateEnum
CREATE TYPE "ImportJobType" AS ENUM ('EXCEL_PATIENTS', 'EXCEL_APPOINTMENTS', 'OCR_DOCUMENT', 'BULK_SCAN');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIALLY_COMPLETED');

-- AlterEnum
BEGIN;
CREATE TYPE "ClinicTier_new" AS ENUM ('CAPTURE', 'CORE', 'PLUS', 'PRO', 'ENTERPRISE');
ALTER TABLE "Clinic" ALTER COLUMN "tier" DROP DEFAULT;
ALTER TABLE "Clinic" ALTER COLUMN "tier" TYPE "ClinicTier_new" USING ("tier"::text::"ClinicTier_new");
ALTER TYPE "ClinicTier" RENAME TO "ClinicTier_old";
ALTER TYPE "ClinicTier_new" RENAME TO "ClinicTier";
DROP TYPE "ClinicTier_old";
ALTER TABLE "Clinic" ALTER COLUMN "tier" SET DEFAULT 'CAPTURE';
COMMIT;

-- DropIndex
DROP INDEX "Appointment_clinicId_createdAt_idx";

-- DropIndex
DROP INDEX "Appointment_clinic_status_date_idx";

-- DropIndex
DROP INDEX "Appointment_createdAt_idx";

-- DropIndex
DROP INDEX "Appointment_doctorId_createdAt_idx";

-- DropIndex
DROP INDEX "Appointment_patientId_createdAt_idx";

-- DropIndex
DROP INDEX "Appointment_startTime_idx";

-- DropIndex
DROP INDEX "Appointment_status_startTime_idx";

-- DropIndex
DROP INDEX "Diagnosis_createdAt_idx";

-- DropIndex
DROP INDEX "Document_createdAt_idx";

-- DropIndex
DROP INDEX "Document_patientId_createdAt_idx";

-- DropIndex
DROP INDEX "Invoice_createdAt_idx";

-- DropIndex
DROP INDEX "Invoice_patientId_createdAt_idx";

-- DropIndex
DROP INDEX "Invoice_status_createdAt_idx";

-- DropIndex
DROP INDEX "Patient_clinicId_createdAt_idx";

-- DropIndex
DROP INDEX "Patient_createdAt_idx";

-- DropIndex
DROP INDEX "Prescription_createdAt_idx";

-- DropIndex
DROP INDEX "Prescription_patientId_createdAt_idx";

-- DropIndex
DROP INDEX "Procedure_createdAt_idx";

-- DropIndex
DROP INDEX "WhatsappLog_clinicId_createdAt_idx";

-- DropIndex
DROP INDEX "WhatsappLog_createdAt_idx";

-- DropIndex
DROP INDEX "WhatsappLog_patientId_createdAt_idx";

-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "branding" JSONB,
ADD COLUMN     "features" JSONB,
ADD COLUMN     "intelligenceAddon" "IntelligenceAddon" NOT NULL DEFAULT 'NONE',
ADD COLUMN     "trialEndsAt" TIMESTAMP(3),
ALTER COLUMN "tier" SET DEFAULT 'CAPTURE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "qualification" TEXT,
ADD COLUMN     "registrationNumber" TEXT,
ADD COLUMN     "signatureUrl" TEXT;

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "type" "ImportJobType" NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'PENDING',
    "fileName" TEXT,
    "fileUrl" TEXT,
    "columnMapping" JSONB,
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "successful" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "results" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OcrDocument" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "processedUrl" TEXT,
    "documentType" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "ocrText" TEXT,
    "extractedData" JSONB,
    "confidence" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "corrections" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OcrDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientMergeSuggestion" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patient1Id" TEXT NOT NULL,
    "patient2Id" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "matchReasons" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "mergedBy" TEXT,
    "mergedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatientMergeSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueToken" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "patientId" TEXT NOT NULL,
    "tokenNumber" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "calledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QueueToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sku" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minQuantity" INTEGER NOT NULL DEFAULT 10,
    "unit" TEXT NOT NULL DEFAULT 'units',
    "purchasePrice" DOUBLE PRECISION,
    "sellingPrice" DOUBLE PRECISION,
    "expiryDate" TIMESTAMP(3),
    "batchNumber" TEXT,
    "supplier" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "notes" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTest" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabTestOrder" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "labTestId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ordered',
    "result" JSONB,
    "resultUrl" TEXT,
    "notes" TEXT,
    "orderedBy" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabTestOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappFlow" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "timing" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappConversation" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "lastMessageAt" TIMESTAMP(3),
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsappMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "providerMsgId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WhatsappMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportJob_clinicId_idx" ON "ImportJob"("clinicId");

-- CreateIndex
CREATE INDEX "ImportJob_status_idx" ON "ImportJob"("status");

-- CreateIndex
CREATE INDEX "OcrDocument_clinicId_idx" ON "OcrDocument"("clinicId");

-- CreateIndex
CREATE INDEX "OcrDocument_patientId_idx" ON "OcrDocument"("patientId");

-- CreateIndex
CREATE INDEX "OcrDocument_status_idx" ON "OcrDocument"("status");

-- CreateIndex
CREATE INDEX "PatientMergeSuggestion_clinicId_idx" ON "PatientMergeSuggestion"("clinicId");

-- CreateIndex
CREATE INDEX "PatientMergeSuggestion_status_idx" ON "PatientMergeSuggestion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PatientMergeSuggestion_patient1Id_patient2Id_key" ON "PatientMergeSuggestion"("patient1Id", "patient2Id");

-- CreateIndex
CREATE INDEX "AuditLog_clinicId_idx" ON "AuditLog"("clinicId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "QueueToken_clinicId_idx" ON "QueueToken"("clinicId");

-- CreateIndex
CREATE INDEX "QueueToken_status_idx" ON "QueueToken"("status");

-- CreateIndex
CREATE INDEX "QueueToken_createdAt_idx" ON "QueueToken"("createdAt");

-- CreateIndex
CREATE INDEX "InventoryItem_clinicId_idx" ON "InventoryItem"("clinicId");

-- CreateIndex
CREATE INDEX "InventoryItem_category_idx" ON "InventoryItem"("category");

-- CreateIndex
CREATE INDEX "InventoryItem_expiryDate_idx" ON "InventoryItem"("expiryDate");

-- CreateIndex
CREATE INDEX "InventoryMovement_inventoryItemId_idx" ON "InventoryMovement"("inventoryItemId");

-- CreateIndex
CREATE INDEX "InventoryMovement_type_idx" ON "InventoryMovement"("type");

-- CreateIndex
CREATE INDEX "InventoryMovement_createdAt_idx" ON "InventoryMovement"("createdAt");

-- CreateIndex
CREATE INDEX "LabTest_clinicId_idx" ON "LabTest"("clinicId");

-- CreateIndex
CREATE INDEX "LabTest_category_idx" ON "LabTest"("category");

-- CreateIndex
CREATE INDEX "LabTestOrder_clinicId_idx" ON "LabTestOrder"("clinicId");

-- CreateIndex
CREATE INDEX "LabTestOrder_patientId_idx" ON "LabTestOrder"("patientId");

-- CreateIndex
CREATE INDEX "LabTestOrder_status_idx" ON "LabTestOrder"("status");

-- CreateIndex
CREATE INDEX "WhatsappFlow_clinicId_idx" ON "WhatsappFlow"("clinicId");

-- CreateIndex
CREATE INDEX "WhatsappFlow_trigger_idx" ON "WhatsappFlow"("trigger");

-- CreateIndex
CREATE INDEX "WhatsappConversation_clinicId_idx" ON "WhatsappConversation"("clinicId");

-- CreateIndex
CREATE INDEX "WhatsappConversation_patientId_idx" ON "WhatsappConversation"("patientId");

-- CreateIndex
CREATE INDEX "WhatsappConversation_status_idx" ON "WhatsappConversation"("status");

-- CreateIndex
CREATE INDEX "WhatsappMessage_conversationId_idx" ON "WhatsappMessage"("conversationId");

-- CreateIndex
CREATE INDEX "WhatsappMessage_createdAt_idx" ON "WhatsappMessage"("createdAt");

-- CreateIndex
CREATE INDEX "Appointment_createdAt_idx" ON "Appointment"("createdAt");

-- CreateIndex
CREATE INDEX "Appointment_startTime_idx" ON "Appointment"("startTime");

-- CreateIndex
CREATE INDEX "Document_patientId_idx" ON "Document"("patientId");

-- CreateIndex
CREATE INDEX "Document_createdAt_idx" ON "Document"("createdAt");

-- CreateIndex
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");

-- CreateIndex
CREATE INDEX "Invoice_patientId_idx" ON "Invoice"("patientId");

-- CreateIndex
CREATE INDEX "Patient_createdAt_idx" ON "Patient"("createdAt");

-- CreateIndex
CREATE INDEX "Prescription_patientId_idx" ON "Prescription"("patientId");

-- CreateIndex
CREATE INDEX "Prescription_createdAt_idx" ON "Prescription"("createdAt");

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabTestOrder" ADD CONSTRAINT "LabTestOrder_labTestId_fkey" FOREIGN KEY ("labTestId") REFERENCES "LabTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsappMessage" ADD CONSTRAINT "WhatsappMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WhatsappConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
