-- AlterTable
ALTER TABLE "StaffNotification" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "StaffNotification_deletedAt_idx" ON "StaffNotification"("deletedAt");
