-- CreateEnum
CREATE TYPE "SupportWhatsAppMessageStatus" AS ENUM ('NEW', 'READ', 'REPLIED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "SupportWhatsAppMessage" (
    "id" TEXT NOT NULL,
    "providerMessageId" TEXT NOT NULL,
    "supportPhoneNumber" TEXT NOT NULL,
    "senderPhoneNumber" TEXT NOT NULL,
    "senderName" TEXT,
    "messageType" TEXT NOT NULL,
    "messageBody" TEXT NOT NULL,
    "status" "SupportWhatsAppMessageStatus" NOT NULL DEFAULT 'NEW',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportWhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupportWhatsAppMessage_providerMessageId_key" ON "SupportWhatsAppMessage"("providerMessageId");

-- CreateIndex
CREATE INDEX "SupportWhatsAppMessage_status_idx" ON "SupportWhatsAppMessage"("status");

-- CreateIndex
CREATE INDEX "SupportWhatsAppMessage_receivedAt_idx" ON "SupportWhatsAppMessage"("receivedAt");

-- CreateIndex
CREATE INDEX "SupportWhatsAppMessage_senderPhoneNumber_idx" ON "SupportWhatsAppMessage"("senderPhoneNumber");

-- CreateIndex
CREATE INDEX "SupportWhatsAppMessage_supportPhoneNumber_idx" ON "SupportWhatsAppMessage"("supportPhoneNumber");
