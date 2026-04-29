-- Expand-contract tenant hardening and invoice-item normalization.
-- All new tenant columns are nullable first so application compatibility is preserved
-- while backfills and read-path migration are rolled out.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Patient"
    WHERE "mrn" IS NOT NULL
    GROUP BY "clinicId", "mrn"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot add clinic-scoped MRN uniqueness while duplicate MRNs exist inside a clinic';
  END IF;
END $$;

DROP INDEX IF EXISTS "Patient_mrn_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Patient_clinicId_mrn_key" ON "Patient"("clinicId", "mrn");

ALTER TABLE "VitalSign" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
UPDATE "VitalSign" AS v
SET "clinicId" = a."clinicId"
FROM "Appointment" AS a
WHERE v."appointmentId" = a."id"
  AND v."clinicId" IS NULL;
CREATE INDEX IF NOT EXISTS "VitalSign_clinicId_idx" ON "VitalSign"("clinicId");

ALTER TABLE "Prescription" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
UPDATE "Prescription" AS p
SET "clinicId" = pat."clinicId"
FROM "Patient" AS pat
WHERE p."patientId" = pat."id"
  AND p."clinicId" IS NULL;
CREATE INDEX IF NOT EXISTS "Prescription_clinicId_date_idx" ON "Prescription"("clinicId", "date");

ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
UPDATE "Document" AS d
SET "clinicId" = pat."clinicId"
FROM "Patient" AS pat
WHERE d."patientId" = pat."id"
  AND d."clinicId" IS NULL;
CREATE INDEX IF NOT EXISTS "Document_clinicId_idx" ON "Document"("clinicId");

ALTER TABLE "PrescriptionTemplate" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
UPDATE "PrescriptionTemplate" AS t
SET "clinicId" = u."clinicId"
FROM "User" AS u
WHERE t."userId" = u."id"
  AND t."clinicId" IS NULL;
CREATE INDEX IF NOT EXISTS "PrescriptionTemplate_clinicId_idx" ON "PrescriptionTemplate"("clinicId");
CREATE INDEX IF NOT EXISTS "PrescriptionTemplate_userId_idx" ON "PrescriptionTemplate"("userId");

ALTER TABLE "AppointmentReminder" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
UPDATE "AppointmentReminder" AS r
SET "clinicId" = a."clinicId"
FROM "Appointment" AS a
WHERE r."appointmentId" = a."id"
  AND r."clinicId" IS NULL;
CREATE INDEX IF NOT EXISTS "AppointmentReminder_clinicId_status_createdAt_idx"
  ON "AppointmentReminder"("clinicId", "status", "createdAt");

ALTER TABLE "InventoryMovement" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
UPDATE "InventoryMovement" AS m
SET "clinicId" = i."clinicId"
FROM "InventoryItem" AS i
WHERE m."inventoryItemId" = i."id"
  AND m."clinicId" IS NULL;
CREATE INDEX IF NOT EXISTS "InventoryMovement_clinicId_createdAt_idx"
  ON "InventoryMovement"("clinicId", "createdAt");

ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
UPDATE "Room" AS r
SET "clinicId" = w."clinicId"
FROM "Ward" AS w
WHERE r."wardId" = w."id"
  AND r."clinicId" IS NULL;
CREATE INDEX IF NOT EXISTS "Room_clinicId_idx" ON "Room"("clinicId");

ALTER TABLE "Bed" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
UPDATE "Bed" AS b
SET "clinicId" = r."clinicId"
FROM "Room" AS r
WHERE b."roomId" = r."id"
  AND b."clinicId" IS NULL;
CREATE INDEX IF NOT EXISTS "Bed_clinicId_status_idx" ON "Bed"("clinicId", "status");

ALTER TABLE "Admission" ADD COLUMN IF NOT EXISTS "clinicId" TEXT;
UPDATE "Admission" AS a
SET "clinicId" = p."clinicId"
FROM "Patient" AS p
WHERE a."patientId" = p."id"
  AND a."clinicId" IS NULL;
CREATE INDEX IF NOT EXISTS "Admission_clinicId_status_idx" ON "Admission"("clinicId", "status");

ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "totalCents" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "subtotalCents" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "discountTotalCents" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "taxTotalCents" INTEGER;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "grandTotalCents" INTEGER;

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

CREATE TABLE IF NOT EXISTS "InvoiceItem" (
  "id" TEXT NOT NULL,
  "invoiceId" TEXT NOT NULL,
  "clinicId" TEXT,
  "description" TEXT NOT NULL,
  "code" TEXT,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "unitPriceCents" INTEGER NOT NULL DEFAULT 0,
  "subtotalCents" INTEGER NOT NULL DEFAULT 0,
  "discountCents" INTEGER NOT NULL DEFAULT 0,
  "taxRateBps" INTEGER NOT NULL DEFAULT 0,
  "taxCents" INTEGER NOT NULL DEFAULT 0,
  "totalCents" INTEGER NOT NULL DEFAULT 0,
  "hsnSac" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

INSERT INTO "InvoiceItem" (
  "id",
  "invoiceId",
  "clinicId",
  "description",
  "code",
  "sourceType",
  "sourceId",
  "quantity",
  "unitPriceCents",
  "subtotalCents",
  "discountCents",
  "taxRateBps",
  "taxCents",
  "totalCents",
  "hsnSac",
  "metadata"
)
SELECT
  CONCAT(inv."id", '-line-', item.ordinality),
  inv."id",
  COALESCE(inv."clinicId", pat."clinicId"),
  LEFT(COALESCE(item.value->>'description', 'Invoice item'), 255),
  COALESCE(item.value->>'cptCode', item.value->>'hsnCode', item.value->>'sacCode'),
  CASE
    WHEN item.value ? 'cptCode' THEN 'CPT'
    WHEN item.value ? 'hsnCode' THEN 'HSN'
    WHEN item.value ? 'sacCode' THEN 'SAC'
    ELSE NULL
  END,
  COALESCE(item.value->>'cptCode', item.value->>'hsnCode', item.value->>'sacCode'),
  COALESCE(
    CASE WHEN (item.value->>'quantity') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (item.value->>'quantity')::double precision END,
    1
  ),
  ROUND(COALESCE(
    CASE WHEN (item.value->>'unitPrice') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (item.value->>'unitPrice')::numeric END,
    CASE WHEN (item.value->>'price') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (item.value->>'price')::numeric END,
    0
  ) * 100)::integer,
  ROUND((
    COALESCE(
      CASE WHEN (item.value->>'unitPrice') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (item.value->>'unitPrice')::numeric END,
      CASE WHEN (item.value->>'price') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (item.value->>'price')::numeric END,
      0
    ) * COALESCE(
      CASE WHEN (item.value->>'quantity') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (item.value->>'quantity')::numeric END,
      1
    )
  ) * 100)::integer,
  ROUND(COALESCE(
    CASE WHEN (item.value->>'discountAmount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (item.value->>'discountAmount')::numeric END,
    0
  ) * 100)::integer,
  ROUND(COALESCE(
    CASE WHEN (item.value->>'taxRate') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (item.value->>'taxRate')::numeric END,
    0
  ) * 100)::integer,
  ROUND(COALESCE(
    CASE WHEN (item.value->>'taxAmount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (item.value->>'taxAmount')::numeric END,
    0
  ) * 100)::integer,
  ROUND(COALESCE(
    CASE WHEN (item.value->>'lineTotal') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (item.value->>'lineTotal')::numeric END,
    (
      COALESCE(
        CASE WHEN (item.value->>'unitPrice') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (item.value->>'unitPrice')::numeric END,
        CASE WHEN (item.value->>'price') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (item.value->>'price')::numeric END,
        0
      ) * COALESCE(
        CASE WHEN (item.value->>'quantity') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (item.value->>'quantity')::numeric END,
        1
      )
    ) - COALESCE(
      CASE WHEN (item.value->>'discountAmount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (item.value->>'discountAmount')::numeric END,
      0
    ) + COALESCE(
      CASE WHEN (item.value->>'taxAmount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN (item.value->>'taxAmount')::numeric END,
      0
    )
  ) * 100)::integer,
  COALESCE(item.value->>'hsnCode', item.value->>'sacCode'),
  item.value
FROM "Invoice" AS inv
JOIN "Patient" AS pat ON pat."id" = inv."patientId"
CROSS JOIN LATERAL jsonb_array_elements(
  CASE
    WHEN jsonb_typeof(inv."items"::jsonb) = 'array' THEN inv."items"::jsonb
    ELSE '[]'::jsonb
  END
) WITH ORDINALITY AS item(value, ordinality)
ON CONFLICT ("id") DO NOTHING;

CREATE INDEX IF NOT EXISTS "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");
CREATE INDEX IF NOT EXISTS "InvoiceItem_clinicId_idx" ON "InvoiceItem"("clinicId");
CREATE INDEX IF NOT EXISTS "InvoiceItem_clinicId_invoiceId_idx" ON "InvoiceItem"("clinicId", "invoiceId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VitalSign_clinicId_fkey') THEN
    ALTER TABLE "VitalSign" ADD CONSTRAINT "VitalSign_clinicId_fkey"
      FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Prescription_clinicId_fkey') THEN
    ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_clinicId_fkey"
      FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Document_clinicId_fkey') THEN
    ALTER TABLE "Document" ADD CONSTRAINT "Document_clinicId_fkey"
      FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PrescriptionTemplate_clinicId_fkey') THEN
    ALTER TABLE "PrescriptionTemplate" ADD CONSTRAINT "PrescriptionTemplate_clinicId_fkey"
      FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AppointmentReminder_appointmentId_fkey') THEN
    ALTER TABLE "AppointmentReminder" ADD CONSTRAINT "AppointmentReminder_appointmentId_fkey"
      FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AppointmentReminder_clinicId_fkey') THEN
    ALTER TABLE "AppointmentReminder" ADD CONSTRAINT "AppointmentReminder_clinicId_fkey"
      FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InventoryMovement_clinicId_fkey') THEN
    ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_clinicId_fkey"
      FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Room_clinicId_fkey') THEN
    ALTER TABLE "Room" ADD CONSTRAINT "Room_clinicId_fkey"
      FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Bed_clinicId_fkey') THEN
    ALTER TABLE "Bed" ADD CONSTRAINT "Bed_clinicId_fkey"
      FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Admission_clinicId_fkey') THEN
    ALTER TABLE "Admission" ADD CONSTRAINT "Admission_clinicId_fkey"
      FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InvoiceItem_invoiceId_fkey') THEN
    ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey"
      FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InvoiceItem_clinicId_fkey') THEN
    ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_clinicId_fkey"
      FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL ON UPDATE CASCADE NOT VALID;
  END IF;
END $$;
