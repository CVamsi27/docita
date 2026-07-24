-- Phase 4 G3: extend the cents-canonical money representation to the remaining
-- Float money fields. Additive-only (schema-locked): new nullable/defaulted
-- integer columns plus an idempotent backfill from the existing Float values.
-- Reads should prefer the *Cents columns with a Float fallback during transition.

-- User.consultationFee → consultationFeeCents
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "consultationFeeCents" INTEGER;
UPDATE "User"
  SET "consultationFeeCents" = ROUND("consultationFee" * 100)
  WHERE "consultationFee" IS NOT NULL AND "consultationFeeCents" IS NULL;

-- LabTest.price → priceCents
ALTER TABLE "LabTest" ADD COLUMN IF NOT EXISTS "priceCents" INTEGER;
UPDATE "LabTest"
  SET "priceCents" = ROUND("price" * 100)
  WHERE "price" IS NOT NULL AND "priceCents" IS NULL;

-- InventoryItem.purchasePrice / sellingPrice → *Cents
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "purchasePriceCents" INTEGER;
ALTER TABLE "InventoryItem" ADD COLUMN IF NOT EXISTS "sellingPriceCents" INTEGER;
UPDATE "InventoryItem"
  SET "purchasePriceCents" = ROUND("purchasePrice" * 100)
  WHERE "purchasePrice" IS NOT NULL AND "purchasePriceCents" IS NULL;
UPDATE "InventoryItem"
  SET "sellingPriceCents" = ROUND("sellingPrice" * 100)
  WHERE "sellingPrice" IS NOT NULL AND "sellingPriceCents" IS NULL;

-- Room.charges → chargesCents (non-null, defaulted)
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "chargesCents" INTEGER NOT NULL DEFAULT 0;
UPDATE "Room"
  SET "chargesCents" = ROUND("charges" * 100)
  WHERE "chargesCents" = 0 AND "charges" <> 0;
