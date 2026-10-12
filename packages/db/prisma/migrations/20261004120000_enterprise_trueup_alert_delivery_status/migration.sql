-- E01 clause 3: record what actually happened when a true-up alert email was sent.
--
-- The row used to be inserted before the send, with failures only logged, so an
-- alert row proved only that an attempt was recorded — not that anyone received
-- it. These columns carry the real outcome.

-- CreateEnum
CREATE TYPE "TrueUpAlertDeliveryStatus" AS ENUM ('PENDING', 'DELIVERED', 'PARTIAL', 'FAILED', 'UNKNOWN');

-- AlterTable
ALTER TABLE "EnterpriseTrueUpAlert"
ADD COLUMN     "deliveryStatus" "TrueUpAlertDeliveryStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "deliveredTo" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "deliveredAt" TIMESTAMP(3) WITH TIME ZONE,
ADD COLUMN     "failureDetail" TEXT;

-- Existing rows predate delivery tracking: their delivery was never recorded, so
-- they are UNKNOWN rather than PENDING (which implies an attempt is still
-- outstanding) and never DELIVERED.
UPDATE "EnterpriseTrueUpAlert" SET "deliveryStatus" = 'UNKNOWN';

-- CreateIndex
CREATE INDEX "EnterpriseTrueUpAlert_deliveryStatus_idx" ON "EnterpriseTrueUpAlert"("deliveryStatus");