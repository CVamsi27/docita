-- Add OCR enhancements to OcrDocument table
ALTER TABLE "OcrDocument" ADD COLUMN "fieldConfidenceScores" JSONB;
ALTER TABLE "OcrDocument" ADD COLUMN "suggestedCorrections" JSONB;
CREATE INDEX "OcrDocument_documentType_idx" ON "OcrDocument"("documentType");

-- Create OcrFeedback table for learning feedback loop
CREATE TABLE "OcrFeedback" (
    "id" TEXT NOT NULL,
    "ocrDocumentId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "providedBy" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "originalValue" TEXT NOT NULL,
    "correctedValue" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "helpful" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OcrFeedback_pkey" PRIMARY KEY ("id")
);

-- Create indexes for OcrFeedback
CREATE INDEX "OcrFeedback_ocrDocumentId_idx" ON "OcrFeedback"("ocrDocumentId");
CREATE INDEX "OcrFeedback_clinicId_idx" ON "OcrFeedback"("clinicId");
CREATE INDEX "OcrFeedback_fieldName_idx" ON "OcrFeedback"("fieldName");

-- Add foreign key constraint
ALTER TABLE "OcrFeedback" ADD CONSTRAINT "OcrFeedback_ocrDocumentId_fkey" FOREIGN KEY ("ocrDocumentId") REFERENCES "OcrDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
