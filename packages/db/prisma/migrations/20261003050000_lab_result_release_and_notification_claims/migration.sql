-- =============================================================================
-- Q02 — atomic lab result release and durable notification delivery
-- =============================================================================
--
-- Two defects this migration closes:
--
-- 1. Release was check-then-act. LabWorkflowCommandService.releaseResult read
--    the order, checked "not COMPLETED", sent the patient a WhatsApp, then wrote
--    status = COMPLETED with an updateMany that carried no status predicate at
--    all. Releasing is reachable from two paths — the manual endpoint and the
--    auto-release that fires from uploadResult/verifyPayment — so a clinician
--    pressing Release while a payment verification completes releases twice and
--    notifies the patient twice. releaseClaimToken fences the claim the same way
--    QueueJob.claimToken fences a job acknowledgment (A01).
--
-- 2. Delivery was fire-and-forget. A WhatsApp failure was caught, logged, and
--    the release proceeded regardless. The order read as fully handled while
--    the patient was never told. The notification now has its own durable state
--    with a lease, so a crashed or failed send is retryable and visible instead
--    of lost.
--
-- Both new columns live on LabTestOrder, which already carries clinicId and is
-- therefore inside the tenant_isolation policy sweep. No new table is created,
-- so RLS coverage is unchanged.
--
-- See docs/operations/RUNBOOKS.md (lab result notification retries).

CREATE TYPE "LabResultNotificationStatus" AS ENUM (
  'NOT_ATTEMPTED',
  'SENDING',
  'SENT',
  'FAILED',
  'SKIPPED_NO_CONTACT'
);

-- Release fencing. NULL means no active claim.
ALTER TABLE "LabTestOrder" ADD COLUMN "releaseClaimToken" TEXT;
ALTER TABLE "LabTestOrder" ADD COLUMN "releasedBy" TEXT;

-- Durable notification delivery.
ALTER TABLE "LabTestOrder"
  ADD COLUMN "resultNotificationStatus" "LabResultNotificationStatus" NOT NULL DEFAULT 'NOT_ATTEMPTED',
  ADD COLUMN "resultNotificationAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "resultNotificationClaimToken" TEXT,
  ADD COLUMN "resultNotificationClaimedAt" TIMESTAMPTZ(3),
  ADD COLUMN "resultNotifiedAt" TIMESTAMPTZ(3),
  ADD COLUMN "resultNotificationLastError" TEXT;

-- The retry sweep reads released orders whose notification is still outstanding
-- or whose delivery lease has expired.
CREATE INDEX "LabTestOrder_notification_retry_idx"
  ON "LabTestOrder"("resultNotificationStatus", "resultNotificationClaimedAt");

-- Orders already released before this migration completed a release but were
-- never sent a notification (the old code swallowed the failure). Marking them
-- NOT_ATTEMPTED is what makes them retryable; defaulting them to SENT would
-- hide the gap, which is the defect being fixed.
UPDATE "LabTestOrder"
SET "resultNotificationStatus" = 'NOT_ATTEMPTED'
WHERE "releasedAt" IS NOT NULL
  AND "resultNotificationStatus" = 'NOT_ATTEMPTED';