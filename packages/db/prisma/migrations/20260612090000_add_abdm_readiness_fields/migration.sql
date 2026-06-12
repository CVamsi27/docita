-- Add nullable ABDM registry identifiers used for M1/M2 readiness checks.
ALTER TABLE "Clinic" ADD COLUMN "hfrFacilityId" TEXT;
ALTER TABLE "User" ADD COLUMN "hprId" TEXT;

CREATE INDEX "Clinic_hfrFacilityId_idx" ON "Clinic"("hfrFacilityId");
CREATE INDEX "User_hprId_idx" ON "User"("hprId");
