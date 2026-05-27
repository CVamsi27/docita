-- Outbox relay backoff bookkeeping. Additive columns; safe for in-flight
-- rows (defaults are NULL = "eligible immediately").

ALTER TABLE "OutboxEvent"
  ADD COLUMN IF NOT EXISTS "nextAttemptAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastAttemptAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "OutboxEvent_processedAt_nextAttemptAt_idx"
  ON "OutboxEvent"("processedAt", "nextAttemptAt");

-- Audit log: support compliance queries that filter by clinic + action.
CREATE INDEX IF NOT EXISTS "AuditLog_clinicId_action_createdAt_idx"
  ON "AuditLog"("clinicId", "action", "createdAt");

-- DoctorTimeOff: full-day overlap queries scoped by doctor + clinic.
CREATE INDEX IF NOT EXISTS "DoctorTimeOff_doctorId_clinicId_startDate_endDate_isFullDay_idx"
  ON "DoctorTimeOff"("doctorId", "clinicId", "startDate", "endDate", "isFullDay");

-- CronHeartbeat: persistence for the @TrackHeartbeat decorator.
DO $$ BEGIN
  CREATE TYPE "CronHeartbeatStatus" AS ENUM ('SUCCESS', 'FAILURE');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "CronHeartbeat" (
  "id"         TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "lastRunAt"  TIMESTAMP(3) NOT NULL,
  "lastStatus" "CronHeartbeatStatus" NOT NULL,
  "lastError"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CronHeartbeat_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CronHeartbeat_name_key" ON "CronHeartbeat"("name");
CREATE INDEX IF NOT EXISTS "CronHeartbeat_lastRunAt_idx" ON "CronHeartbeat"("lastRunAt");

-- Invoice: optional idempotency key for create paths. Unique-when-present so
-- duplicate POSTs from a retrying client are deduped by the service layer.
ALTER TABLE "Invoice"
  ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_idempotencyKey_key"
  ON "Invoice"("idempotencyKey");
