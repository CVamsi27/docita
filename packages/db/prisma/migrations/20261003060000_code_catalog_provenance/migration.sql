-- CreateEnum
CREATE TYPE "CodeCatalogSystem" AS ENUM ('ICD', 'CPT');

-- CreateEnum
CREATE TYPE "CodeCatalogSyncStatus" AS ENUM ('RUNNING', 'COMPLETED', 'TRUNCATED', 'FAILED');

-- AlterTable
ALTER TABLE "CptCode" ADD COLUMN     "lastSyncedAt" TIMESTAMPTZ(3),
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "sourceVersion" TEXT,
ADD COLUMN     "system" TEXT NOT NULL DEFAULT 'HCPCS',
ADD COLUMN     "version" TEXT NOT NULL DEFAULT 'HCPCS';

-- AlterTable
ALTER TABLE "IcdCode" ADD COLUMN     "lastSyncedAt" TIMESTAMPTZ(3),
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN     "sourceVersion" TEXT,
ADD COLUMN     "system" TEXT NOT NULL DEFAULT 'ICD-10-CM';

-- CreateTable
CREATE TABLE "CodeCatalogSyncRun" (
    "id" TEXT NOT NULL,
    "system" "CodeCatalogSystem" NOT NULL,
    "source" TEXT NOT NULL,
    "sourceVersion" TEXT,
    "status" "CodeCatalogSyncStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(3),
    "codesSeen" INTEGER NOT NULL DEFAULT 0,
    "batchesApplied" INTEGER NOT NULL DEFAULT 0,
    "unitsSkipped" INTEGER NOT NULL DEFAULT 0,
    "lastUnit" TEXT,
    "error" TEXT,

    CONSTRAINT "CodeCatalogSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CodeCatalogSyncRun_system_startedAt_idx" ON "CodeCatalogSyncRun"("system", "startedAt");

-- CreateIndex
CREATE INDEX "CodeCatalogSyncRun_status_idx" ON "CodeCatalogSyncRun"("status");

-- CreateIndex
CREATE INDEX "CptCode_lastSyncedAt_idx" ON "CptCode"("lastSyncedAt");

-- CreateIndex
CREATE INDEX "IcdCode_lastSyncedAt_idx" ON "IcdCode"("lastSyncedAt");
