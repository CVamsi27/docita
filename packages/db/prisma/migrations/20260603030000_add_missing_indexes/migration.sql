-- Add missing indexes for frequently queried tables.
--
-- WhatsappConversation: contactPhone lookups for inbox search
-- WhatsappMessage: direction-based inbox filtering, conversation+direction queries
-- ErrorLog: endpoint-level error aggregation

CREATE INDEX IF NOT EXISTS "WhatsappConversation_contactPhone_idx"
  ON "WhatsappConversation" ("contactPhone");

CREATE INDEX IF NOT EXISTS "WhatsappMessage_direction_idx"
  ON "WhatsappMessage" ("direction");

CREATE INDEX IF NOT EXISTS "WhatsappMessage_conversationId_direction_idx"
  ON "WhatsappMessage" ("conversationId", "direction");

CREATE INDEX IF NOT EXISTS "ErrorLog_path_method_idx"
  ON "ErrorLog" ("path", "method");
