-- CreateTable BulkImportJob
CREATE TABLE "BulkImportJob" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    -- Job Details
    "entityType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "originalKey" TEXT NOT NULL,

    -- Progress
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,

    -- Error Tracking
    "errors" JSONB NOT NULL DEFAULT '[]',
    "errorSummary" TEXT,

    -- Timing
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,

    -- Results
    "importedIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resultKey" TEXT,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for queries
CREATE INDEX "BulkImportJob_clinicId_idx" ON "BulkImportJob"("clinicId");
CREATE INDEX "BulkImportJob_status_idx" ON "BulkImportJob"("status");
CREATE INDEX "BulkImportJob_entityType_idx" ON "BulkImportJob"("entityType");
CREATE INDEX "BulkImportJob_createdAt_idx" ON "BulkImportJob"("createdAt");
CREATE INDEX "BulkImportJob_clinicId_createdAt_idx" ON "BulkImportJob"("clinicId", "createdAt");
CREATE INDEX "BulkImportJob_userId_idx" ON "BulkImportJob"("userId");

-- AddForeignKey
ALTER TABLE "BulkImportJob" ADD CONSTRAINT "BulkImportJob_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BulkImportJob" ADD CONSTRAINT "BulkImportJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
