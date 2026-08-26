-- Backfill canonical integer money columns for invoices created before the
-- cents columns existed (or by the Excel import path, which wrote only the
-- legacy Float mirrors). Idempotent: only rows still at 0 paise are touched,
-- so rows already managed through the canonical columns are never modified.

UPDATE "Invoice"
SET "totalCents"          = ROUND("total"::numeric * 100)::int,
    "subtotalCents"       = ROUND("subtotal"::numeric * 100)::int,
    "discountTotalCents"  = ROUND("discountTotal"::numeric * 100)::int,
    "taxTotalCents"       = ROUND("taxTotal"::numeric * 100)::int,
    "grandTotalCents"     = ROUND("grandTotal"::numeric * 100)::int
WHERE "totalCents" = 0
  AND "grandTotalCents" = 0
  AND ("total" <> 0 OR "grandTotal" <> 0);

-- Re-derive collected amounts for invoices whose rollup lags behind their
-- settled payment sessions (CAPTURED/PAID, matching
-- invoice-payment-rollup.ts), so desk settlement sees the right balance.
UPDATE "Invoice" i
SET "amountPaidCents" = s.paid_cents
FROM (
  SELECT "invoiceId", SUM("amount") AS paid_cents
  FROM "PaymentSession"
  WHERE "status" IN ('CAPTURED', 'PAID')
  GROUP BY "invoiceId"
) s
WHERE i."id" = s."invoiceId"
  AND i."amountPaidCents" < s.paid_cents;
