-- Main feature audit remediation: persistent onboarding sessions, canonical invoice cents, and payment webhook idempotency.
ALTER TABLE "Invoice"
  ALTER COLUMN "totalCents" SET DEFAULT 0,
  ALTER COLUMN "subtotalCents" SET DEFAULT 0,
  ALTER COLUMN "discountTotalCents" SET DEFAULT 0,
  ALTER COLUMN "taxTotalCents" SET DEFAULT 0,
  ALTER COLUMN "grandTotalCents" SET DEFAULT 0;

UPDATE "Invoice"
SET
  "totalCents" = COALESCE("totalCents", ROUND(COALESCE("total", 0)::numeric * 100)::integer),
  "subtotalCents" = COALESCE("subtotalCents", ROUND(COALESCE("subtotal", 0)::numeric * 100)::integer),
  "discountTotalCents" = COALESCE("discountTotalCents", ROUND(COALESCE("discountTotal", 0)::numeric * 100)::integer),
  "taxTotalCents" = COALESCE("taxTotalCents", ROUND(COALESCE("taxTotal", 0)::numeric * 100)::integer),
  "grandTotalCents" = COALESCE("grandTotalCents", ROUND(COALESCE("grandTotal", 0)::numeric * 100)::integer)
WHERE "totalCents" IS NULL
   OR "subtotalCents" IS NULL
   OR "discountTotalCents" IS NULL
   OR "taxTotalCents" IS NULL
   OR "grandTotalCents" IS NULL;

ALTER TABLE "Invoice"
  ALTER COLUMN "totalCents" SET NOT NULL,
  ALTER COLUMN "subtotalCents" SET NOT NULL,
  ALTER COLUMN "discountTotalCents" SET NOT NULL,
  ALTER COLUMN "taxTotalCents" SET NOT NULL,
  ALTER COLUMN "grandTotalCents" SET NOT NULL;

ALTER TABLE "PaymentSession" ADD COLUMN "providerPaymentId" TEXT;
CREATE INDEX "PaymentSession_providerPaymentId_idx" ON "PaymentSession"("providerPaymentId");
CREATE UNIQUE INDEX "PaymentSession_provider_providerPaymentId_key" ON "PaymentSession"("provider", "providerPaymentId");

CREATE TABLE "OnboardingSession" (
  "id" TEXT NOT NULL,
  "currentStep" TEXT NOT NULL,
  "completedSteps" JSONB NOT NULL,
  "data" JSONB NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OnboardingSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OnboardingSession_expiresAt_idx" ON "OnboardingSession"("expiresAt");
