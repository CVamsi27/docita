-- AlterEnum
ALTER TYPE "FacilityLeadStatus" ADD VALUE 'DUPLICATE_REVIEW';

-- AlterTable
ALTER TABLE "FacilityLead" ADD COLUMN     "duplicateOfId" TEXT,
ADD COLUMN     "duplicateScore" DOUBLE PRECISION,
ADD COLUMN     "fingerprint" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "FacilityLead_fingerprint_key" ON "FacilityLead"("fingerprint");

-- CreateIndex
CREATE INDEX "FacilityLead_duplicateOfId_idx" ON "FacilityLead"("duplicateOfId");

-- AddForeignKey
ALTER TABLE "FacilityLead" ADD CONSTRAINT "FacilityLead_duplicateOfId_fkey" FOREIGN KEY ("duplicateOfId") REFERENCES "FacilityLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

