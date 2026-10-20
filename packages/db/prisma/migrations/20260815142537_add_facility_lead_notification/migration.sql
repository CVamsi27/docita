-- CreateEnum
CREATE TYPE "FacilityLeadNotificationKind" AS ENUM ('LEAD_CREATED', 'LEAD_CONVERTED');

-- CreateEnum
CREATE TYPE "FacilityLeadNotificationStatus" AS ENUM ('QUEUED', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "FacilityLeadNotification" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "kind" "FacilityLeadNotificationKind" NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'internal',
    "status" "FacilityLeadNotificationStatus" NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB NOT NULL,
    "errorMessage" TEXT,
    "deliveredAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacilityLeadNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FacilityLeadNotification_status_idx" ON "FacilityLeadNotification"("status");

-- CreateIndex
CREATE INDEX "FacilityLeadNotification_leadId_createdAt_idx" ON "FacilityLeadNotification"("leadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityLeadNotification_leadId_kind_key" ON "FacilityLeadNotification"("leadId", "kind");

-- AddForeignKey
ALTER TABLE "FacilityLeadNotification" ADD CONSTRAINT "FacilityLeadNotification_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "FacilityLead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
