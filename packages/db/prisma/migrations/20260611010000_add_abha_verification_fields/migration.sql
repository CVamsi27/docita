-- ABDM M1: persist ABHA verification state on the patient.
--
-- abhaNumber:     14-digit ABHA number returned by the ABDM gateway on verify.
-- abhaKycName:    verified KYC name from ABDM (for name-match confirmation).
-- abhaVerifiedAt: timestamp of successful gateway verification; NULL = captured
--                 but not yet gateway-verified.
-- All nullable/additive — existing rows are unaffected and remain "captured,
-- not verified". Schema-lock compliant (no drops, no data loss).

ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "abhaNumber" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "abhaKycName" TEXT;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "abhaVerifiedAt" TIMESTAMPTZ(3);
