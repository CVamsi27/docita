-- AlterTable
ALTER TABLE "FacilityLead" ADD COLUMN     "assignmentHistory" JSONB,
ADD COLUMN     "ownerUserId" TEXT;

-- AlterTable
ALTER TABLE "FacilityLeadNotification" ADD COLUMN     "recipientUserId" TEXT;

-- CreateIndex
CREATE INDEX "FacilityLead_ownerUserId_idx" ON "FacilityLead"("ownerUserId");

-- CreateIndex
CREATE INDEX "FacilityLeadNotification_recipientUserId_idx" ON "FacilityLeadNotification"("recipientUserId");

-- AddForeignKey
ALTER TABLE "FacilityLead" ADD CONSTRAINT "FacilityLead_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
