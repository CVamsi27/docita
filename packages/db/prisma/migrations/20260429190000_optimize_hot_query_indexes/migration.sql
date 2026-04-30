-- Composite indexes for hot tenant-scoped read paths.
-- Goal: avoid sequential scans on Invoice / InventoryItem / PaymentSession
-- when filtering by (clinicId, status[, createdAt]) or (clinicId, providerSessionId).

-- Invoice: tenant-scoped status board / billing list ordering by createdAt.
CREATE INDEX IF NOT EXISTS "Invoice_clinicId_status_createdAt_desc_idx"
  ON "Invoice" ("clinicId", "status", "createdAt" DESC);

-- InventoryItem: active-only stock list per clinic (most common filter).
CREATE INDEX IF NOT EXISTS "InventoryItem_clinicId_active_idx"
  ON "InventoryItem" ("clinicId", "active");

-- InventoryItem: per-clinic category drill-down used by stock board filters.
CREATE INDEX IF NOT EXISTS "InventoryItem_clinicId_category_idx"
  ON "InventoryItem" ("clinicId", "category");

-- PaymentSession: tenant-scoped lookup by Razorpay/upstream provider session id.
CREATE INDEX IF NOT EXISTS "PaymentSession_clinicId_providerSessionId_idx"
  ON "PaymentSession" ("clinicId", "providerSessionId");

-- PaymentSession: tenant-scoped status filter (pending/CAPTURED counts, dashboards).
CREATE INDEX IF NOT EXISTS "PaymentSession_clinicId_status_idx"
  ON "PaymentSession" ("clinicId", "status");
