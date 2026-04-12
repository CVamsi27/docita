-- Add thread-aware support WhatsApp inbox fields and durable outbound reply tracking

DO $$
BEGIN
  CREATE TYPE "SupportWhatsAppMessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE "SupportWhatsAppMessageStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "SupportWhatsAppMessageStatus" ADD VALUE IF NOT EXISTS 'SENT';
ALTER TYPE "SupportWhatsAppMessageStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "SupportWhatsAppMessageStatus" ADD VALUE IF NOT EXISTS 'FAILED';

ALTER TABLE "SupportWhatsAppMessage"
  ADD COLUMN IF NOT EXISTS "threadPhoneNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "providerSentMessageId" TEXT,
  ADD COLUMN IF NOT EXISTS "direction" "SupportWhatsAppMessageDirection",
  ADD COLUMN IF NOT EXISTS "replyToProviderMessageId" TEXT,
  ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;

UPDATE "SupportWhatsAppMessage"
SET "threadPhoneNumber" = COALESCE("threadPhoneNumber", "senderPhoneNumber");

UPDATE "SupportWhatsAppMessage"
SET "direction" = CASE
  WHEN "senderPhoneNumber" = "supportPhoneNumber" THEN 'OUTBOUND'
  ELSE 'INBOUND'
END
WHERE "direction" IS NULL;

ALTER TABLE "SupportWhatsAppMessage"
  ALTER COLUMN "threadPhoneNumber" SET NOT NULL,
  ALTER COLUMN "direction" SET DEFAULT 'INBOUND',
  ALTER COLUMN "direction" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "SupportWhatsAppMessage_providerSentMessageId_key"
  ON "SupportWhatsAppMessage"("providerSentMessageId");

CREATE INDEX IF NOT EXISTS "SupportWhatsAppMessage_direction_receivedAt_idx"
  ON "SupportWhatsAppMessage"("direction", "receivedAt");

CREATE INDEX IF NOT EXISTS "SupportWhatsAppMessage_threadPhoneNumber_receivedAt_idx"
  ON "SupportWhatsAppMessage"("threadPhoneNumber", "receivedAt");

CREATE INDEX IF NOT EXISTS "SupportWhatsAppMessage_threadPhoneNumber_status_idx"
  ON "SupportWhatsAppMessage"("threadPhoneNumber", "status");
