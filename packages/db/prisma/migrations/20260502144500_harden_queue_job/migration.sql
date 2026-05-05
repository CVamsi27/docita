-- AlterEnum
ALTER TYPE "QueueJobStatus" ADD VALUE 'DEAD_LETTERED';

-- AlterTable
ALTER TABLE "QueueJob"
  ADD COLUMN "idempotencyKey" TEXT,
  ADD COLUMN "completedAt"    TIMESTAMP(3),
  ADD COLUMN "deadLetteredAt" TIMESTAMP(3);

-- AlterTable: bump default attempts to match the production retry budget
ALTER TABLE "QueueJob" ALTER COLUMN "maxAttempts" SET DEFAULT 5;

-- CreateIndex
CREATE INDEX "QueueJob_idempotency_lookup_idx"
  ON "QueueJob" ("name", "idempotencyKey", "completedAt" DESC);
