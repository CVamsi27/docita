-- PdfJob (clinicId, documentId, documentType) unique constraint was added to an
-- already-applied migration (20260413000000). Production databases that ran that
-- migration before the edit need this follow-up to match schema.prisma.

-- Production ran without the unique index, so re-enqueues may have created duplicates.
DELETE FROM "PdfJob" AS duplicate
WHERE duplicate.id IN (
  SELECT id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY "clinicId", "documentId", "documentType"
        ORDER BY "createdAt" DESC, id DESC
      ) AS row_num
    FROM "PdfJob"
  ) ranked
  WHERE row_num > 1
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'PdfJob_clinicId_documentId_documentType_key'
  ) THEN
    ALTER TABLE "PdfJob"
      ADD CONSTRAINT "PdfJob_clinicId_documentId_documentType_key"
      UNIQUE ("clinicId", "documentId", "documentType");
  END IF;
END $$;
