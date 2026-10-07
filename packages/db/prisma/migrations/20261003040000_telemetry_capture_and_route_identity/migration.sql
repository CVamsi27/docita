-- =============================================================================
-- O02 — telemetry capture health, route category, valid latency samples
-- =============================================================================
--
-- Three defects this migration closes:
--
-- 1. Request logging is fail-soft. RequestLogService disables persistence when
--    the database rejects it and clears its buffer, so coverage silently stops.
--    A dashboard reading the last retained rows could not tell "quiet system"
--    from "nothing was captured". TelemetryCaptureEvent makes the gap durable.
--
-- 2. ApiRequest has no route family. Liveness/readiness probes hit the same
--    interceptor as clinician traffic, so request volume, latency distribution
--    and hourly rollups were dominated by synthetic probes.
--
-- 3. ApiRequest.createdAt is the row insert time. The row is buffered for up to
--    5s and, after a persistence fault, for as long as the outage lasts — so a
--    request completed at 10:00 could be written during the 11:00 hourly rollup
--    and permanently distort that bucket, which the hourly upsert then keeps.
--    observedAt records when the request finished; createdAt stays the row age
--    used for retention.
--
-- QueueJob.status remains current state. QueueJobExecution is the append-only
-- outcome history that makes a recovered retry distinguishable from a clean run.
--
-- Neither new table carries clinicId: both are platform-scoped, so they are
-- outside the tenant_isolation policy sweep by design and are only ever reached
-- through an explicit unrestricted (RLS-BYPASS) repository call.
--
-- The two path expressions above are the same strings exported as
-- HEALTH_PATH_REGEX_SOURCE and INTERNAL_PATH_REGEX_SOURCE in
-- apps/api/src/shared/modules/monitoring/monitoring/rules/telemetry-observation.rules.ts.
-- That spec reads this file and fails if the two drift.
--
-- See docs/operations/RUNBOOKS.md (telemetry coverage) and
-- docs/compliance/RLS_ROLLOUT.md.

-- --- 1. Route category ------------------------------------------------------

CREATE TYPE "RouteCategory" AS ENUM ('CUSTOMER', 'HEALTH_CHECK', 'INTERNAL');

ALTER TABLE "ApiRequest"
  ADD COLUMN "routeCategory" "RouteCategory" NOT NULL DEFAULT 'CUSTOMER';

-- Historical rows are classified from their own path so pre-existing traffic is
-- not retroactively reported as customer traffic.
UPDATE "ApiRequest"
SET "routeCategory" = 'HEALTH_CHECK'
WHERE "path" ~ '^/(api/)?v?[0-9]*/?health(/|$)';

UPDATE "ApiRequest"
SET "routeCategory" = 'INTERNAL'
WHERE "routeCategory" = 'CUSTOMER'
  AND "path" ~ '^/(api/)?v?[0-9]*/?internal(/|$)';

-- --- 2. Observation instant and correlation ----------------------------------

-- Backfill from createdAt. Buffered rows that landed late are still attributed
-- to their flush time, which is the best estimate available for history; only
-- new rows carry a true request completion instant.
ALTER TABLE "ApiRequest" ADD COLUMN "observedAt" TIMESTAMPTZ(3);
UPDATE "ApiRequest" SET "observedAt" = "createdAt" WHERE "observedAt" IS NULL;
ALTER TABLE "ApiRequest"
  ALTER COLUMN "observedAt" SET NOT NULL,
  ALTER COLUMN "observedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Composite index only once both columns exist.
CREATE INDEX "ApiRequest_routeCategory_observedAt_idx"
  ON "ApiRequest"("routeCategory", "observedAt");
CREATE INDEX "ApiRequest_observedAt_idx" ON "ApiRequest"("observedAt");

ALTER TABLE "ApiRequest" ADD COLUMN "correlationId" TEXT;
CREATE INDEX "ApiRequest_correlationId_idx" ON "ApiRequest"("correlationId");

ALTER TABLE "ErrorLog" ADD COLUMN "correlationId" TEXT;
CREATE INDEX "ErrorLog_correlationId_idx" ON "ErrorLog"("correlationId");

-- --- 3. Valid latency samples -----------------------------------------------

ALTER TABLE "ApiRequest"
  ADD COLUMN "latencyValid" BOOLEAN NOT NULL DEFAULT true;

-- A retained duration beyond the believable ceiling (clock skew, a suspended
-- host, a stalled event loop) is kept for inspection but must not be averaged
-- into latency reporting.
UPDATE "ApiRequest" SET "latencyValid" = false WHERE "duration" > 120000 OR "duration" < 0;

-- --- 4. Durable capture health ----------------------------------------------

CREATE TYPE "TelemetryCaptureState" AS ENUM (
  'CAPTURE_DISABLED',
  'CAPTURE_TRUNCATED',
  'CAPTURE_RECOVERED'
);

CREATE TABLE "TelemetryCaptureEvent" (
  "id" TEXT NOT NULL,
  "state" "TelemetryCaptureState" NOT NULL,
  "reason" TEXT NOT NULL,
  "droppedRequests" INTEGER NOT NULL DEFAULT 0,
  "bufferedRequests" INTEGER NOT NULL DEFAULT 0,
  "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TelemetryCaptureEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TelemetryCaptureEvent_state_recordedAt_idx"
  ON "TelemetryCaptureEvent"("state", "recordedAt");
CREATE INDEX "TelemetryCaptureEvent_recordedAt_idx"
  ON "TelemetryCaptureEvent"("recordedAt");

-- --- 5. Immutable job outcomes ----------------------------------------------

CREATE TYPE "QueueJobOutcome" AS ENUM (
  'COMPLETED',
  'RETRY_SCHEDULED',
  'DEAD_LETTERED',
  'CLAIM_LOST',
  'IDEMPOTENT_SKIP',
  'STALE_RECOVERED',
  'REPLAYED'
);

CREATE TABLE "QueueJobExecution" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "queueName" TEXT NOT NULL,
  "outcome" "QueueJobOutcome" NOT NULL,
  "attempt" INTEGER NOT NULL,
  "claimToken" TEXT,
  "durationMs" INTEGER,
  "failedReason" TEXT,
  "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QueueJobExecution_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QueueJobExecution_attempt_positive" CHECK ("attempt" >= 1),
  CONSTRAINT "QueueJobExecution_duration_non_negative" CHECK ("durationMs" IS NULL OR "durationMs" >= 0)
);

-- No foreign key to "QueueJob": the execution history must outlive the job row.
-- removeJob() and clear() delete jobs; the history is the record of what they did.
CREATE INDEX "QueueJobExecution_jobId_occurredAt_idx"
  ON "QueueJobExecution"("jobId", "occurredAt");
CREATE INDEX "QueueJobExecution_outcome_occurredAt_idx"
  ON "QueueJobExecution"("outcome", "occurredAt");
CREATE INDEX "QueueJobExecution_queueName_occurredAt_idx"
  ON "QueueJobExecution"("queueName", "occurredAt");