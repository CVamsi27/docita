-- CreateEnum
CREATE TYPE "WhatsappTemplateCategory" AS ENUM ('APPOINTMENT', 'PRESCRIPTION', 'INVOICE', 'PAYMENT', 'FOLLOW_UP', 'MARKETING', 'STAFF_NOTIFICATION');

-- CreateEnum
CREATE TYPE "WhatsappButtonType" AS ENUM ('NONE', 'QUICK_REPLY', 'CALL_TO_ACTION');

-- CreateEnum
CREATE TYPE "WhatsappTemplateStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PatientResponseType" AS ENUM ('CONFIRM', 'ON_THE_WAY', 'DELAY', 'RESCHEDULE', 'CANCEL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "StaffNotificationType" AS ENUM ('PATIENT_RESPONSE', 'APPOINTMENT_CANCEL', 'APPOINTMENT_DELAY', 'PRESCRIPTION_PENDING', 'INVOICE_PENDING', 'SYSTEM_ALERT');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'AUTO_APPROVED');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "whatsappMessageId" TEXT,
ADD COLUMN     "whatsappSentAt" TIMESTAMP(3),
ADD COLUMN     "whatsappStatus" TEXT;

-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN     "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "whatsappMessageId" TEXT,
ADD COLUMN     "whatsappSentAt" TIMESTAMP(3),
ADD COLUMN     "whatsappStatus" TEXT;

-- AlterTable
ALTER TABLE "ReminderSettings" ADD COLUMN     "minutesBefore30" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappTemplate" TEXT;

-- CreateTable
CREATE TABLE "WhatsappTemplate" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT,
    "name" TEXT NOT NULL,
    "category" "WhatsappTemplateCategory" NOT NULL,
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "buttonType" "WhatsappButtonType" NOT NULL DEFAULT 'NONE',
    "buttons" JSONB,
    "status" "WhatsappTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "twilioContentSid" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentResponse" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "responseType" "PatientResponseType" NOT NULL,
    "responseTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "patientMessage" TEXT,
    "delayMinutes" INTEGER,
    "staffNotified" BOOLEAN NOT NULL DEFAULT false,
    "staffNotifiedAt" TIMESTAMP(3),
    "handledById" TEXT,
    "handledAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppointmentResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffNotification" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "userId" TEXT,
    "type" "StaffNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsappTemplate_clinicId_idx" ON "WhatsappTemplate"("clinicId");

-- CreateIndex
CREATE INDEX "WhatsappTemplate_category_idx" ON "WhatsappTemplate"("category");

-- CreateIndex
CREATE INDEX "WhatsappTemplate_status_idx" ON "WhatsappTemplate"("status");

-- CreateIndex
CREATE INDEX "WhatsappTemplate_isActive_idx" ON "WhatsappTemplate"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappTemplate_clinicId_name_version_key" ON "WhatsappTemplate"("clinicId", "name", "version");

-- CreateIndex
CREATE INDEX "AppointmentResponse_appointmentId_idx" ON "AppointmentResponse"("appointmentId");

-- CreateIndex
CREATE INDEX "AppointmentResponse_responseType_idx" ON "AppointmentResponse"("responseType");

-- CreateIndex
CREATE INDEX "AppointmentResponse_staffNotified_idx" ON "AppointmentResponse"("staffNotified");

-- CreateIndex
CREATE INDEX "AppointmentResponse_createdAt_idx" ON "AppointmentResponse"("createdAt");

-- CreateIndex
CREATE INDEX "StaffNotification_clinicId_idx" ON "StaffNotification"("clinicId");

-- CreateIndex
CREATE INDEX "StaffNotification_userId_idx" ON "StaffNotification"("userId");

-- CreateIndex
CREATE INDEX "StaffNotification_isRead_idx" ON "StaffNotification"("isRead");

-- CreateIndex
CREATE INDEX "StaffNotification_createdAt_idx" ON "StaffNotification"("createdAt");

-- CreateIndex
CREATE INDEX "StaffNotification_type_idx" ON "StaffNotification"("type");

-- AddForeignKey
ALTER TABLE "WhatsappTemplate" ADD CONSTRAINT "WhatsappTemplate_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentResponse" ADD CONSTRAINT "AppointmentResponse_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffNotification" ADD CONSTRAINT "StaffNotification_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffNotification" ADD CONSTRAINT "StaffNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
