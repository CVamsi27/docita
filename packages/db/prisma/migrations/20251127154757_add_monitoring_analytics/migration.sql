/*
  Warnings:

  - A unique constraint covering the columns `[appointmentId]` on the table `QueueToken` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "FeedbackCategory" AS ENUM ('GENERAL', 'UI_UX', 'PERFORMANCE', 'FEATURES', 'BILLING', 'SUPPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "FeedbackStatus" AS ENUM ('NEW', 'REVIEWED', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ErrorSeverity" AS ENUM ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('CPU_USAGE', 'MEMORY_USAGE', 'HEAP_USED', 'HEAP_TOTAL', 'ACTIVE_CONNECTIONS', 'DB_QUERY_TIME', 'UPTIME', 'REQUEST_COUNT', 'ERROR_RATE', 'AVG_RESPONSE_TIME');

-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "avgConsultationMinutes" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "lateArrivalGraceMinutes" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "queueBufferMinutes" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "useDoctorQueues" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "QueueToken" ADD COLUMN     "consultationEnd" TIMESTAMP(3),
ADD COLUMN     "consultationStart" TIMESTAMP(3),
ADD COLUMN     "doctorId" TEXT,
ADD COLUMN     "estimatedDuration" INTEGER NOT NULL DEFAULT 15,
ADD COLUMN     "estimatedWaitTime" INTEGER,
ADD COLUMN     "scheduledTime" TIMESTAMP(3),
ADD COLUMN     "tokenType" TEXT NOT NULL DEFAULT 'walk-in';

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "overallRating" INTEGER NOT NULL DEFAULT 3,
    "goodFeatures" TEXT[],
    "goodFeaturesReason" TEXT,
    "badFeatures" TEXT[],
    "badFeaturesReason" TEXT,
    "improvementAreas" TEXT[],
    "improvementReason" TEXT,
    "featureRequests" TEXT,
    "generalComments" TEXT,
    "category" "FeedbackCategory" NOT NULL DEFAULT 'GENERAL',
    "status" "FeedbackStatus" NOT NULL DEFAULT 'NEW',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiRequest" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT,
    "userId" TEXT,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "requestSize" INTEGER,
    "responseSize" INTEGER,
    "userAgent" TEXT,
    "ip" TEXT,
    "error" TEXT,
    "errorStack" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT,
    "userId" TEXT,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "path" TEXT,
    "method" TEXT,
    "statusCode" INTEGER,
    "userAgent" TEXT,
    "ip" TEXT,
    "requestBody" JSONB,
    "metadata" JSONB,
    "severity" "ErrorSeverity" NOT NULL DEFAULT 'ERROR',
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemMetric" (
    "id" TEXT NOT NULL,
    "metricType" "MetricType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "metadata" JSONB,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceAggregate" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "totalRequests" INTEGER NOT NULL,
    "successCount" INTEGER NOT NULL,
    "errorCount" INTEGER NOT NULL,
    "avgDuration" DOUBLE PRECISION NOT NULL,
    "minDuration" INTEGER NOT NULL,
    "maxDuration" INTEGER NOT NULL,
    "p50Duration" INTEGER,
    "p95Duration" INTEGER,
    "p99Duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feedback_clinicId_idx" ON "Feedback"("clinicId");

-- CreateIndex
CREATE INDEX "Feedback_userId_idx" ON "Feedback"("userId");

-- CreateIndex
CREATE INDEX "Feedback_status_idx" ON "Feedback"("status");

-- CreateIndex
CREATE INDEX "Feedback_category_idx" ON "Feedback"("category");

-- CreateIndex
CREATE INDEX "Feedback_createdAt_idx" ON "Feedback"("createdAt");

-- CreateIndex
CREATE INDEX "ApiRequest_clinicId_idx" ON "ApiRequest"("clinicId");

-- CreateIndex
CREATE INDEX "ApiRequest_userId_idx" ON "ApiRequest"("userId");

-- CreateIndex
CREATE INDEX "ApiRequest_path_idx" ON "ApiRequest"("path");

-- CreateIndex
CREATE INDEX "ApiRequest_statusCode_idx" ON "ApiRequest"("statusCode");

-- CreateIndex
CREATE INDEX "ApiRequest_createdAt_idx" ON "ApiRequest"("createdAt");

-- CreateIndex
CREATE INDEX "ApiRequest_duration_idx" ON "ApiRequest"("duration");

-- CreateIndex
CREATE INDEX "ErrorLog_clinicId_idx" ON "ErrorLog"("clinicId");

-- CreateIndex
CREATE INDEX "ErrorLog_type_idx" ON "ErrorLog"("type");

-- CreateIndex
CREATE INDEX "ErrorLog_severity_idx" ON "ErrorLog"("severity");

-- CreateIndex
CREATE INDEX "ErrorLog_resolved_idx" ON "ErrorLog"("resolved");

-- CreateIndex
CREATE INDEX "ErrorLog_createdAt_idx" ON "ErrorLog"("createdAt");

-- CreateIndex
CREATE INDEX "SystemMetric_metricType_idx" ON "SystemMetric"("metricType");

-- CreateIndex
CREATE INDEX "SystemMetric_recordedAt_idx" ON "SystemMetric"("recordedAt");

-- CreateIndex
CREATE INDEX "PerformanceAggregate_period_idx" ON "PerformanceAggregate"("period");

-- CreateIndex
CREATE INDEX "PerformanceAggregate_periodStart_idx" ON "PerformanceAggregate"("periodStart");

-- CreateIndex
CREATE INDEX "PerformanceAggregate_path_idx" ON "PerformanceAggregate"("path");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceAggregate_path_method_period_periodStart_key" ON "PerformanceAggregate"("path", "method", "period", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "QueueToken_appointmentId_key" ON "QueueToken"("appointmentId");

-- CreateIndex
CREATE INDEX "QueueToken_doctorId_idx" ON "QueueToken"("doctorId");

-- CreateIndex
CREATE INDEX "QueueToken_scheduledTime_idx" ON "QueueToken"("scheduledTime");

-- AddForeignKey
ALTER TABLE "QueueToken" ADD CONSTRAINT "QueueToken_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueToken" ADD CONSTRAINT "QueueToken_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueToken" ADD CONSTRAINT "QueueToken_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QueueToken" ADD CONSTRAINT "QueueToken_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
