-- CreateTable AnalyticsSnapshot
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "snapshotDate" TIMESTAMP(3) NOT NULL,

    -- Revenue Metrics
    "totalRevenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "invoiceCount" INTEGER NOT NULL DEFAULT 0,
    "avgInvoiceAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,

    -- Appointment Metrics
    "totalAppointments" INTEGER NOT NULL DEFAULT 0,
    "completedAppts" INTEGER NOT NULL DEFAULT 0,
    "cancelledAppts" INTEGER NOT NULL DEFAULT 0,
    "appointmentFillRate" DECIMAL(5,2) NOT NULL DEFAULT 0,

    -- Patient Metrics
    "newPatients" INTEGER NOT NULL DEFAULT 0,
    "activePatients" INTEGER NOT NULL DEFAULT 0,
    "appointmentRate" DECIMAL(5,2) NOT NULL DEFAULT 0,

    -- Condition Metrics
    "topConditions" JSONB NOT NULL DEFAULT '[]',

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for queries and uniqueness
CREATE INDEX "AnalyticsSnapshot_clinicId_idx" ON "AnalyticsSnapshot"("clinicId");
CREATE INDEX "AnalyticsSnapshot_period_idx" ON "AnalyticsSnapshot"("period");
CREATE INDEX "AnalyticsSnapshot_snapshotDate_idx" ON "AnalyticsSnapshot"("snapshotDate");
CREATE UNIQUE INDEX "AnalyticsSnapshot_clinicId_period_snapshotDate_key" ON "AnalyticsSnapshot"("clinicId", "period", "snapshotDate");

-- AddForeignKey
ALTER TABLE "AnalyticsSnapshot" ADD CONSTRAINT "AnalyticsSnapshot_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
