-- CreateTable SystemMetric (for performance monitoring and feature tracking)
CREATE TABLE "SystemMetric" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,

    -- Performance Metrics
    "apiResponseTime" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "dbQueryTime" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "cacheHitRate" DECIMAL(5,2) NOT NULL DEFAULT 0,

    -- Feature Usage
    "aiAnalysisCount" INTEGER NOT NULL DEFAULT 0,
    "bulkImportCount" INTEGER NOT NULL DEFAULT 0,
    "auditLogCount" INTEGER NOT NULL DEFAULT 0,

    -- Load Metrics
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "concurrentSessions" INTEGER NOT NULL DEFAULT 0,
    "errorRate" DECIMAL(5,2) NOT NULL DEFAULT 0,

    -- Storage
    "storageUsedMB" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "databaseSizeMB" DECIMAL(12,2) NOT NULL DEFAULT 0,

    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for queries
CREATE INDEX "SystemMetric_clinicId_idx" ON "SystemMetric"("clinicId");
CREATE INDEX "SystemMetric_recordedAt_idx" ON "SystemMetric"("recordedAt");
CREATE INDEX "SystemMetric_clinicId_recordedAt_idx" ON "SystemMetric"("clinicId", "recordedAt");

-- AddForeignKey
ALTER TABLE "SystemMetric" ADD CONSTRAINT "SystemMetric_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
