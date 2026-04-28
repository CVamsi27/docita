-- Add tax-aware invoice fields while preserving legacy totals and item JSON.

ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "clinicId" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "invoiceType" TEXT NOT NULL DEFAULT 'BILL_OF_SUPPLY',
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "discountTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "taxTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "grandTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "taxSummary" JSONB,
  ADD COLUMN IF NOT EXISTS "sellerTaxSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "buyerTaxSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "placeOfSupplyStateCode" TEXT,
  ADD COLUMN IF NOT EXISTS "placeOfSupplyStateName" TEXT,
  ADD COLUMN IF NOT EXISTS "reverseCharge" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "issuedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "eInvoiceRequired" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "eInvoiceIrn" TEXT,
  ADD COLUMN IF NOT EXISTS "eInvoiceQrCode" TEXT,
  ADD COLUMN IF NOT EXISTS "eInvoiceAcknowledgedAt" TIMESTAMP(3);

UPDATE "Invoice" AS i
SET "clinicId" = p."clinicId"
FROM "Patient" AS p
WHERE i."patientId" = p."id"
  AND i."clinicId" IS NULL;

UPDATE "Invoice"
SET
  "invoiceType" = 'LEGACY',
  "currency" = COALESCE("currency", 'INR'),
  "subtotal" = COALESCE(NULLIF("subtotal", 0), COALESCE("total", 0)),
  "grandTotal" = COALESCE(NULLIF("grandTotal", 0), COALESCE("total", 0)),
  "issuedAt" = COALESCE("issuedAt", "createdAt"),
  "dueDate" = COALESCE("dueDate", "createdAt" + INTERVAL '30 days'),
  "taxSummary" = COALESCE(
    "taxSummary",
    jsonb_build_object(
      'countryCode', 'IN',
      'regime', 'IN_GST',
      'currency', COALESCE("currency", 'INR'),
      'subtotal', COALESCE("total", 0),
      'discountTotal', 0,
      'taxableAmount', 0,
      'exemptAmount', COALESCE("total", 0),
      'taxTotal', 0,
      'grandTotal', COALESCE("total", 0),
      'components', '[]'::jsonb,
      'reverseCharge', false,
      'documentTitle', 'Legacy Invoice'
    )
  ),
  "sellerTaxSnapshot" = COALESCE(
    "sellerTaxSnapshot",
    jsonb_build_object('countryCode', 'IN', 'regime', 'IN_GST', 'source', 'legacy_backfill')
  ),
  "buyerTaxSnapshot" = COALESCE(
    "buyerTaxSnapshot",
    jsonb_build_object('countryCode', 'IN', 'regime', 'IN_GST', 'source', 'legacy_backfill')
  );

CREATE TABLE IF NOT EXISTS "InvoiceSequence" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "financialYear" TEXT NOT NULL,
  "prefix" TEXT NOT NULL DEFAULT 'DC',
  "currentValue" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InvoiceSequence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceSequence_clinicId_financialYear_key"
  ON "InvoiceSequence"("clinicId", "financialYear");
CREATE INDEX IF NOT EXISTS "InvoiceSequence_clinicId_idx"
  ON "InvoiceSequence"("clinicId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'InvoiceSequence_clinicId_fkey'
  ) THEN
    ALTER TABLE "InvoiceSequence"
      ADD CONSTRAINT "InvoiceSequence_clinicId_fkey"
      FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_clinicId_invoiceNumber_key"
  ON "Invoice"("clinicId", "invoiceNumber");
CREATE INDEX IF NOT EXISTS "Invoice_clinicId_idx"
  ON "Invoice"("clinicId");
CREATE INDEX IF NOT EXISTS "Invoice_clinicId_issuedAt_idx"
  ON "Invoice"("clinicId", "issuedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_clinicId_fkey'
  ) THEN
    ALTER TABLE "Invoice"
      ADD CONSTRAINT "Invoice_clinicId_fkey"
      FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "SubscriptionPayment"
  ADD COLUMN IF NOT EXISTS "invoiceType" TEXT,
  ADD COLUMN IF NOT EXISTS "subtotalCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "taxCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "grandTotalCents" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "taxSummary" JSONB,
  ADD COLUMN IF NOT EXISTS "sellerTaxSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "buyerTaxSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "placeOfSupplyStateCode" TEXT,
  ADD COLUMN IF NOT EXISTS "reverseCharge" BOOLEAN NOT NULL DEFAULT false;

UPDATE "SubscriptionPayment"
SET
  "invoiceType" = COALESCE("invoiceType", 'LEGACY'),
  "subtotalCents" = CASE WHEN "subtotalCents" = 0 THEN "amountCents" ELSE "subtotalCents" END,
  "grandTotalCents" = CASE WHEN "grandTotalCents" = 0 THEN "amountCents" ELSE "grandTotalCents" END,
  "taxSummary" = COALESCE(
    "taxSummary",
    jsonb_build_object(
      'countryCode', 'IN',
      'regime', 'IN_GST',
      'currency', COALESCE("currency", 'INR'),
      'subtotal', "amountCents" / 100.0,
      'discountTotal', 0,
      'taxableAmount', 0,
      'exemptAmount', "amountCents" / 100.0,
      'taxTotal', 0,
      'grandTotal', "amountCents" / 100.0,
      'components', '[]'::jsonb,
      'reverseCharge', false,
      'documentTitle', 'Legacy Subscription Invoice'
    )
  );
