-- CreateIndex
CREATE INDEX "MedicalDocument_clinicId_type_status_idx" ON "MedicalDocument"("clinicId", "type", "status");

-- CreateIndex
CREATE INDEX "FollowUp_clinicId_status_scheduledDate_idx" ON "FollowUp"("clinicId", "status", "scheduledDate");

-- CreateIndex
CREATE INDEX "DataSubjectRequest_clinicId_requestType_status_idx" ON "DataSubjectRequest"("clinicId", "requestType", "status");

-- AlterTable
ALTER TABLE "ClinicSecret" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
