-- AlterTable
ALTER TABLE "FacilityLeadNotification" ADD COLUMN "acknowledgedAt" TIMESTAMPTZ(3),
ADD COLUMN "acknowledgedByUserId" TEXT;
