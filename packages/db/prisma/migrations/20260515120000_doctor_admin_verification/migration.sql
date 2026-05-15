-- Additive fields to support admin-driven manual verification of doctor registration numbers.
-- Holds an uploaded registration certificate URL and an audit trail of which internal admin verified the doctor.

ALTER TABLE "User"
  ADD COLUMN "registrationCertificateUrl" TEXT,
  ADD COLUMN "verifiedByAdminId" TEXT,
  ADD COLUMN "verifiedByAdminAt" TIMESTAMP(3);

CREATE INDEX "User_verificationStatus_idx" ON "User"("verificationStatus");
