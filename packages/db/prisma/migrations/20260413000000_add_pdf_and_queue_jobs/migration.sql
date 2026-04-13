-- Add async PDF job tracking and durable queue infrastructure

DO $$
BEGIN
  CREATE TYPE "PdfJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "QueueJobStatus" AS ENUM ('WAITING', 'ACTIVE', 'COMPLETED', 'FAILED', 'DELAYED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PdfJob" (
  "id"           TEXT         NOT NULL,
  "clinicId"     TEXT         NOT NULL,
  "documentId"   TEXT         NOT NULL,
  "documentType" TEXT         NOT NULL,
  "status"       "PdfJobStatus" NOT NULL DEFAULT 'PENDING',
  "pdfUrl"       TEXT,
  "failedReason" TEXT,
  "attemptsMade" INTEGER      NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt"  TIMESTAMP(3),
  CONSTRAINT "PdfJob_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PdfJob"
  ADD CONSTRAINT "PdfJob_clinicId_fkey"
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "PdfJob_clinicId_idx"       ON "PdfJob"("clinicId");
CREATE INDEX IF NOT EXISTS "PdfJob_status_idx"          ON "PdfJob"("status");
CREATE INDEX IF NOT EXISTS "PdfJob_documentId_documentType_idx" ON "PdfJob"("documentId", "documentType");

CREATE TABLE IF NOT EXISTS "QueueJob" (
  "id"           TEXT             NOT NULL,
  "name"         TEXT             NOT NULL,
  "data"         JSONB            NOT NULL,
  "status"       "QueueJobStatus" NOT NULL DEFAULT 'WAITING',
  "priority"     INTEGER          NOT NULL DEFAULT 0,
  "attemptsMade" INTEGER          NOT NULL DEFAULT 0,
  "maxAttempts"  INTEGER          NOT NULL DEFAULT 3,
  "failedReason" TEXT,
  "processedAt"  TIMESTAMP(3),
  "delayedUntil" TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QueueJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "QueueJob_name_status_idx"        ON "QueueJob"("name", "status");
CREATE INDEX IF NOT EXISTS "QueueJob_status_delayedUntil_idx" ON "QueueJob"("status", "delayedUntil");
CREATE INDEX IF NOT EXISTS "QueueJob_createdAt_idx"           ON "QueueJob"("createdAt");
