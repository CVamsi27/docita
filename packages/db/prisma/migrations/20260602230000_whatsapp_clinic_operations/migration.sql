-- Expand WhatsApp conversations into a tenant-safe staff inbox and add
-- clinic-owned campaign metadata while preserving platform broadcast jobs.
CREATE TYPE "WhatsAppBroadcastSource" AS ENUM ('INTERNAL', 'CLINIC');
CREATE TYPE "WhatsappMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

ALTER TABLE "WhatsappConversation"
  ADD COLUMN "contactPhone" TEXT,
  ADD COLUMN "unreadCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastReadAt" TIMESTAMPTZ(3);

UPDATE "WhatsappConversation" conversation
SET "contactPhone" = COALESCE(patient."phoneNumber", conversation."id")
FROM "Patient" patient
WHERE patient."id" = conversation."patientId";

UPDATE "WhatsappConversation"
SET "contactPhone" = "id"
WHERE "contactPhone" IS NULL;

ALTER TABLE "WhatsappConversation"
  ALTER COLUMN "contactPhone" SET NOT NULL,
  ALTER COLUMN "patientId" DROP NOT NULL;

ALTER TABLE "WhatsappMessage"
  ADD COLUMN "errorMessage" TEXT,
  ALTER COLUMN "direction" TYPE "WhatsappMessageDirection"
    USING "direction"::"WhatsappMessageDirection";

ALTER TABLE "WhatsAppBroadcastJob"
  ADD COLUMN "clinicId" TEXT,
  ADD COLUMN "source" "WhatsAppBroadcastSource" NOT NULL DEFAULT 'INTERNAL',
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "nextAttemptAt" TIMESTAMPTZ(3),
  ADD COLUMN "lastAttemptAt" TIMESTAMPTZ(3),
  ADD COLUMN "leaseExpiresAt" TIMESTAMPTZ(3),
  ADD COLUMN "cancelRequestedAt" TIMESTAMPTZ(3);

ALTER TABLE "WhatsAppBroadcastRecipient"
  ADD COLUMN "patientId" TEXT,
  ADD COLUMN "skipReason" TEXT,
  ADD COLUMN "whatsappConsentAt" TIMESTAMPTZ(3),
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastAttemptAt" TIMESTAMPTZ(3);

CREATE UNIQUE INDEX "WhatsappConversation_clinicId_contactPhone_key"
  ON "WhatsappConversation"("clinicId", "contactPhone");
CREATE INDEX "WhatsappConversation_clinicId_status_lastMessageAt_idx"
  ON "WhatsappConversation"("clinicId", "status", "lastMessageAt");
CREATE INDEX "WhatsappMessage_providerMsgId_idx"
  ON "WhatsappMessage"("providerMsgId");
CREATE INDEX "WhatsappMessage_conversationId_createdAt_idx"
  ON "WhatsappMessage"("conversationId", "createdAt");
CREATE INDEX "WhatsAppBroadcastJob_clinicId_createdAt_idx"
  ON "WhatsAppBroadcastJob"("clinicId", "createdAt");
CREATE INDEX "WhatsAppBroadcastJob_status_nextAttemptAt_createdAt_idx"
  ON "WhatsAppBroadcastJob"("status", "nextAttemptAt", "createdAt");
CREATE INDEX "WhatsAppBroadcastRecipient_patientId_idx"
  ON "WhatsAppBroadcastRecipient"("patientId");
CREATE INDEX "WhatsAppBroadcastRecipient_broadcastJobId_status_idx"
  ON "WhatsAppBroadcastRecipient"("broadcastJobId", "status");

ALTER TABLE "WhatsappConversation"
  ADD CONSTRAINT "WhatsappConversation_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "WhatsappConversation_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WhatsAppBroadcastJob"
  ADD CONSTRAINT "WhatsAppBroadcastJob_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WhatsAppBroadcastRecipient"
  ADD CONSTRAINT "WhatsAppBroadcastRecipient_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
