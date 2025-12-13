-- Add invoice and prescription fields to WhatsappLog table
ALTER TABLE "WhatsappLog" ADD COLUMN "invoiceId" TEXT;
ALTER TABLE "WhatsappLog" ADD COLUMN "prescriptionId" TEXT;

-- Create indexes for the new columns
CREATE INDEX "WhatsappLog_invoiceId_idx" ON "WhatsappLog"("invoiceId");
CREATE INDEX "WhatsappLog_prescriptionId_idx" ON "WhatsappLog"("prescriptionId");
