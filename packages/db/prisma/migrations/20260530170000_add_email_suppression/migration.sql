-- Email suppression list (hard bounces, spam complaints, unsubscribes)
-- populated from the ESP delivery webhook. Hash-keyed so no raw PHI email is
-- stored; the masked form is for operator visibility only. Additive only.

CREATE TYPE "EmailSuppressionReason" AS ENUM ('HARD_BOUNCE', 'SOFT_BOUNCE', 'COMPLAINT', 'UNSUBSCRIBE');

CREATE TABLE "EmailSuppression" (
  "id"          TEXT                     NOT NULL,
  "emailHash"   TEXT                     NOT NULL,
  "maskedEmail" TEXT                     NOT NULL,
  "reason"      "EmailSuppressionReason" NOT NULL,
  "detail"      TEXT,
  "provider"    TEXT                     NOT NULL DEFAULT 'zeptomail',
  "createdAt"   timestamptz(3)           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   timestamptz(3)           NOT NULL,

  CONSTRAINT "EmailSuppression_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailSuppression_emailHash_key" ON "EmailSuppression" ("emailHash");

CREATE INDEX "EmailSuppression_createdAt_idx" ON "EmailSuppression" ("createdAt");
