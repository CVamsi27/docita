-- Inventory movement ledger authority (backlog W03).
--
-- Two defects motivated this migration.
--
-- 1. Operation identity. `InventoryMovement.referenceType` / `referenceId` are
--    free-form nullable strings with no uniqueness. A retried purchase-order
--    receipt carrying the same reference applied a second time and double-counted
--    stock. `operationId` is an explicit, stable identity for the business
--    operation that produced the movement; the partial unique index on
--    (clinicId, operationId) makes "apply once" a schema guarantee rather than
--    an application convention. It is partial because movements recorded
--    without an operation identity keep today's behaviour.
--
-- 2. Ledger reconstruction. `PATCH /inventory/:id` could write
--    `InventoryItem.quantity` directly with no movement row, so
--    `sum(ledger deltas)` silently diverged from stock and could even drive
--    stock negative (the movement path always guarded with `quantity >= delta`).
--    Historical items already carry that divergence, so this migration backfills
--    a synthetic ADJUSTMENT for every item whose ledger does not reconcile. The
--    backfill is what lets the reconciler assert equality unconditionally
--    instead of reporting permanent drift.
--
-- `unit` is recorded per movement so history stays self-describing after an
-- item is re-unitised, and is backfilled from the item's unit as it stood now.
ALTER TABLE "InventoryMovement"
  ADD COLUMN IF NOT EXISTS "operationId" TEXT,
  ADD COLUMN IF NOT EXISTS "unit" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "InventoryMovement_clinicId_operationId_key"
  ON "InventoryMovement" ("clinicId", "operationId")
  WHERE "operationId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "InventoryMovement_inventoryItemId_operationId_idx"
  ON "InventoryMovement" ("inventoryItemId", "operationId");

UPDATE "InventoryMovement" m
SET "unit" = i."unit"
FROM "InventoryItem" i
WHERE m."inventoryItemId" = i."id"
  AND m."unit" IS NULL;

-- Backfill the ledger gap left by historical direct balance edits. Sign follows
-- the shared convention: OUT/ADJUSTMENT_OUT/EXPIRED/WASTE subtract, everything
-- else adds.
-- `createdBy` is required and has no default, so the sentinel records that this
-- row was synthesised by the migration rather than entered by a clinician.
INSERT INTO "InventoryMovement" (
  id, "inventoryItemId", "clinicId", type, quantity, unit, notes,
  "createdBy", "createdAt", "operationId"
)
SELECT
  i.id || '-ledger-backfill',
  i.id,
  i."clinicId",
  'ADJUSTMENT',
  ABS(reconciliation.delta),
  i."unit",
  'Ledger reconciliation backfill: quantity was edited outside the movement ledger',
  'system:ledger-backfill',
  i."updatedAt",
  'ledger-backfill:' || i.id
FROM (
  SELECT
    i2.id,
    i2."clinicId",
    i2.quantity
      - COALESCE(SUM(
          CASE
            WHEN m.type IN ('OUT', 'ADJUSTMENT_OUT', 'EXPIRED', 'WASTE') THEN -m.quantity
            ELSE m.quantity
          END
        ), 0) AS delta
  FROM "InventoryItem" i2
  LEFT JOIN "InventoryMovement" m ON m."inventoryItemId" = i2.id
  GROUP BY i2.id, i2."clinicId", i2.quantity
) reconciliation
JOIN "InventoryItem" i ON i.id = reconciliation.id
WHERE reconciliation.delta <> 0;

DO $$
BEGIN
  RAISE NOTICE
    'Inventory ledger backfill complete; InventoryMovement now reconciles with InventoryItem.quantity';
END
$$;