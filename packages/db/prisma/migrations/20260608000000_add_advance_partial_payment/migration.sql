-- Track how much of an invoice has been collected so PARTIALLY_PAID can be
-- derived and a balance shown. Additive, defaulted — no backfill needed.
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "amountPaidCents" INTEGER NOT NULL DEFAULT 0;

-- Advance payment captured at booking time, later applied to the appointment's
-- invoice as a settled (manual) payment session.
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "advanceAmountCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "advancePaymentMethod" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "advanceReference" TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "advanceNotes" TEXT;
