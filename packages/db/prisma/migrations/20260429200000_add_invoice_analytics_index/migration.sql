CREATE INDEX IF NOT EXISTS "Invoice_clinicId_createdAt_desc_idx"
  ON "Invoice"("clinicId", "createdAt" DESC);
