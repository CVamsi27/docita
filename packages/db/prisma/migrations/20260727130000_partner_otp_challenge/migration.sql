-- Partner self-service portal OTP challenges (additive only, schema-locked).
--
-- One row per active OTP. Older rows for the same phone are invalidated by
-- the partner-auth service when a new request arrives. `attempts` is
-- incremented atomically by the repository on each verify so a concurrent
-- brute-force cannot bypass the cap.

CREATE TABLE "PartnerOtpChallenge" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PartnerOtpChallenge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PartnerOtpChallenge_phone_expiresAt_idx" ON "PartnerOtpChallenge"("phone", "expiresAt");
