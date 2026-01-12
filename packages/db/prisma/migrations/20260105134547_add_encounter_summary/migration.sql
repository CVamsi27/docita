/*
  Warnings:

  - The `doctorSpecialization` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `doctorRole` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `doctorSpecialization` column on the `Prescription` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `doctorRole` column on the `Prescription` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `activeUsers` on the `SystemMetric` table. All the data in the column will be lost.
  - You are about to drop the column `aiAnalysisCount` on the `SystemMetric` table. All the data in the column will be lost.
  - You are about to drop the column `apiResponseTime` on the `SystemMetric` table. All the data in the column will be lost.
  - You are about to drop the column `auditLogCount` on the `SystemMetric` table. All the data in the column will be lost.
  - You are about to drop the column `bulkImportCount` on the `SystemMetric` table. All the data in the column will be lost.
  - You are about to drop the column `cacheHitRate` on the `SystemMetric` table. All the data in the column will be lost.
  - You are about to drop the column `clinicId` on the `SystemMetric` table. All the data in the column will be lost.
  - You are about to drop the column `concurrentSessions` on the `SystemMetric` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `SystemMetric` table. All the data in the column will be lost.
  - You are about to drop the column `databaseSizeMB` on the `SystemMetric` table. All the data in the column will be lost.
  - You are about to drop the column `dbQueryTime` on the `SystemMetric` table. All the data in the column will be lost.
  - You are about to drop the column `errorRate` on the `SystemMetric` table. All the data in the column will be lost.
  - You are about to drop the column `storageUsedMB` on the `SystemMetric` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `SystemMetric` table. All the data in the column will be lost.
  - Added the required column `metricType` to the `SystemMetric` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `SystemMetric` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SystemMetric" DROP CONSTRAINT "SystemMetric_clinicId_fkey";

-- DropIndex
DROP INDEX "SystemMetric_clinicId_idx";

-- DropIndex
DROP INDEX "SystemMetric_clinicId_recordedAt_idx";

-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "encounterSummary" TEXT;

-- AlterTable
ALTER TABLE "CptCode" ADD COLUMN     "isCommon" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "IcdCode" ADD COLUMN     "isCommon" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "doctorSpecialization",
ADD COLUMN     "doctorSpecialization" "Specialization",
DROP COLUMN "doctorRole",
ADD COLUMN     "doctorRole" "HospitalRole";

-- AlterTable
ALTER TABLE "Prescription" DROP COLUMN "doctorSpecialization",
ADD COLUMN     "doctorSpecialization" "Specialization",
DROP COLUMN "doctorRole",
ADD COLUMN     "doctorRole" "HospitalRole";

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "autoPayEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "failureRetryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "graceUntil" TIMESTAMP(3),
ADD COLUMN     "lastFailedPaymentDate" TIMESTAMP(3),
ADD COLUMN     "paymentMethodType" TEXT,
ADD COLUMN     "razorpayCustomerId" TEXT,
ADD COLUMN     "razorpayTokenId" TEXT;

-- AlterTable
ALTER TABLE "SystemMetric" DROP COLUMN "activeUsers",
DROP COLUMN "aiAnalysisCount",
DROP COLUMN "apiResponseTime",
DROP COLUMN "auditLogCount",
DROP COLUMN "bulkImportCount",
DROP COLUMN "cacheHitRate",
DROP COLUMN "clinicId",
DROP COLUMN "concurrentSessions",
DROP COLUMN "createdAt",
DROP COLUMN "databaseSizeMB",
DROP COLUMN "dbQueryTime",
DROP COLUMN "errorRate",
DROP COLUMN "storageUsedMB",
DROP COLUMN "updatedAt",
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "metricType" "MetricType" NOT NULL,
ADD COLUMN     "unit" TEXT,
ADD COLUMN     "value" DOUBLE PRECISION NOT NULL;

-- CreateIndex
CREATE INDEX "Appointment_clinicId_status_startTime_idx" ON "Appointment"("clinicId", "status", "startTime");

-- CreateIndex
CREATE INDEX "CptCode_isCommon_idx" ON "CptCode"("isCommon");

-- CreateIndex
CREATE INDEX "IcdCode_isCommon_idx" ON "IcdCode"("isCommon");

-- CreateIndex
CREATE INDEX "Patient_clinicId_lastName_firstName_idx" ON "Patient"("clinicId", "lastName", "firstName");

-- CreateIndex
CREATE INDEX "Patient_clinicId_createdAt_idx" ON "Patient"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "SystemMetric_metricType_idx" ON "SystemMetric"("metricType");
