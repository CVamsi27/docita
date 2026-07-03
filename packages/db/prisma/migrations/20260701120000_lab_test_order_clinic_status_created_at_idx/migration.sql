-- CreateIndex
CREATE INDEX "LabTestOrder_clinicId_status_createdAt_idx" ON "LabTestOrder"("clinicId", "status", "createdAt");
