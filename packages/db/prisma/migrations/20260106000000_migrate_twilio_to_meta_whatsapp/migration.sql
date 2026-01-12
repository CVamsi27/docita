-- Migration: Twilio to Meta WhatsApp Cloud API
-- This migration updates the WhatsApp integration from Twilio to Meta's Cloud API

-- Update WhatsappLog provider default from 'twilio' to 'meta'
ALTER TABLE "WhatsappLog" ALTER COLUMN "provider" SET DEFAULT 'meta';

-- Rename twilioContentSid to metaTemplateId in WhatsappTemplate
ALTER TABLE "WhatsappTemplate" RENAME COLUMN "twilioContentSid" TO "metaTemplateId";

-- Add comment to clarify the column purpose
COMMENT ON COLUMN "WhatsappTemplate"."metaTemplateId" IS 'Meta WhatsApp template ID for production use';

-- Update existing records (optional - keeps historical data but marks new default)
-- Note: Existing records will retain 'twilio' provider value for audit purposes
-- New records will default to 'meta'
