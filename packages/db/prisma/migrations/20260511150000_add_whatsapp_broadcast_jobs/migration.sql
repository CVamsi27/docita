-- CreateEnum
CREATE TYPE "WhatsAppBroadcastJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WhatsAppBroadcastRecipientStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "WhatsAppBroadcastJob" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "audienceLabel" TEXT,
    "templateName" TEXT,
    "languageCode" TEXT NOT NULL DEFAULT 'en',
    "messageText" TEXT,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "WhatsAppBroadcastJobStatus" NOT NULL DEFAULT 'PENDING',
    "createdBy" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppBroadcastJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppBroadcastRecipient" (
    "id" TEXT NOT NULL,
    "broadcastJobId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "name" TEXT,
    "variables" JSONB,
    "status" "WhatsAppBroadcastRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppBroadcastRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WhatsAppBroadcastJob_status_idx" ON "WhatsAppBroadcastJob"("status");

-- CreateIndex
CREATE INDEX "WhatsAppBroadcastJob_createdAt_idx" ON "WhatsAppBroadcastJob"("createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppBroadcastRecipient_broadcastJobId_idx" ON "WhatsAppBroadcastRecipient"("broadcastJobId");

-- CreateIndex
CREATE INDEX "WhatsAppBroadcastRecipient_status_idx" ON "WhatsAppBroadcastRecipient"("status");

-- CreateIndex
CREATE INDEX "WhatsAppBroadcastRecipient_phoneNumber_idx" ON "WhatsAppBroadcastRecipient"("phoneNumber");

-- AddForeignKey
ALTER TABLE "WhatsAppBroadcastRecipient" ADD CONSTRAINT "WhatsAppBroadcastRecipient_broadcastJobId_fkey" FOREIGN KEY ("broadcastJobId") REFERENCES "WhatsAppBroadcastJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
