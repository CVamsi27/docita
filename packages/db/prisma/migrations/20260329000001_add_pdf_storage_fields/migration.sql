-- Add PDF storage fields to Prescription
-- PDFs are generated once and stored immutably in R2 for audit trail integrity
ALTER TABLE "Prescription" ADD COLUMN "pdfUrl" TEXT;
ALTER TABLE "Prescription" ADD COLUMN "pdfGeneratedAt" TIMESTAMP(3);
ALTER TABLE "Prescription" ADD COLUMN "pdfTemplateVersion" INTEGER NOT NULL DEFAULT 1;

-- Add PDF storage fields to Invoice
ALTER TABLE "Invoice" ADD COLUMN "pdfUrl" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "pdfGeneratedAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "pdfTemplateVersion" INTEGER NOT NULL DEFAULT 1;
