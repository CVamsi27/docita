-- Compatibility migration for local databases that recorded the earlier
-- invoice analytics index migration name before the broader hot-query index
-- migration was committed.

CREATE INDEX IF NOT EXISTS "Invoice_clinicId_status_createdAt_desc_idx"
  ON "Invoice" ("clinicId", "status", "createdAt" DESC);
