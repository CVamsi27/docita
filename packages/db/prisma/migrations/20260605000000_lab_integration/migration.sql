-- Lab integration: dedicated LAB role, lab directory (internal/external),
-- sample-collection + result-upload + payment-verification workflow on lab orders.
-- Fully additive: new enum values, a new enum + table, and nullable columns only.

-- New LAB staff role
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'LAB';

-- Extend the lab order lifecycle with sample-collected and result-ready states
ALTER TYPE "LabTestOrderStatus" ADD VALUE IF NOT EXISTS 'SAMPLE_COLLECTED';
ALTER TYPE "LabTestOrderStatus" ADD VALUE IF NOT EXISTS 'RESULT_READY';

-- Lab kind: in-house department vs external partner
CREATE TYPE "LabType" AS ENUM ('INTERNAL', 'EXTERNAL');

-- Lab directory (clinic-scoped). External partners are clinic-owned records.
CREATE TABLE "Lab" (
  "id" TEXT NOT NULL,
  "clinicId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "LabType" NOT NULL DEFAULT 'INTERNAL',
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" timestamptz(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" timestamptz(3) NOT NULL,

  CONSTRAINT "Lab_pkey" PRIMARY KEY ("id")
);

-- Scope a LAB user to a single lab
ALTER TABLE "User" ADD COLUMN "labId" TEXT;

-- Order routing + sample/result/payment/release tracking
ALTER TABLE "LabTestOrder"
  ADD COLUMN "labId" TEXT,
  ADD COLUMN "resultUploadedBy" TEXT,
  ADD COLUMN "resultUploadedAt" timestamptz(3),
  ADD COLUMN "paidAt" timestamptz(3),
  ADD COLUMN "paymentVerifiedBy" TEXT,
  ADD COLUMN "paymentMethod" TEXT,
  ADD COLUMN "paymentReference" TEXT,
  ADD COLUMN "releasedAt" timestamptz(3);

CREATE INDEX "Lab_clinicId_idx" ON "Lab"("clinicId");
CREATE INDEX "Lab_clinicId_active_idx" ON "Lab"("clinicId", "active");
CREATE INDEX "User_labId_idx" ON "User"("labId");
CREATE INDEX "LabTestOrder_labId_idx" ON "LabTestOrder"("labId");

ALTER TABLE "User"
  ADD CONSTRAINT "User_labId_fkey"
  FOREIGN KEY ("labId") REFERENCES "Lab"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LabTestOrder"
  ADD CONSTRAINT "LabTestOrder_labId_fkey"
  FOREIGN KEY ("labId") REFERENCES "Lab"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
