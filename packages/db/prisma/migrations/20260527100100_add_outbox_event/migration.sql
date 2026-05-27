-- Transactional outbox for domain events.
-- Producers append rows in the same `prisma.$transaction` as the business
-- write. The relay worker (`apps/worker/src/processors/outbox.processor.ts`)
-- polls rows with `processedAt IS NULL` and dispatches them via the
-- in-process EventEmitter2, marking `processedAt` on success or bumping
-- `attempts` + `lastError` on failure.
-- See docs/architecture/decisions/0010-transactional-outbox.md.

CREATE TABLE "OutboxEvent" (
    "id"             TEXT NOT NULL,
    "eventName"      TEXT NOT NULL,
    "aggregateType"  TEXT,
    "aggregateId"    TEXT,
    "clinicId"       TEXT,
    "payload"        JSONB NOT NULL,
    "idempotencyKey" TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt"    TIMESTAMP(3),
    "attempts"       INTEGER NOT NULL DEFAULT 0,
    "lastError"      TEXT,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OutboxEvent_idempotencyKey_key" ON "OutboxEvent"("idempotencyKey");
CREATE INDEX "OutboxEvent_processedAt_createdAt_idx" ON "OutboxEvent"("processedAt", "createdAt");
CREATE INDEX "OutboxEvent_clinicId_idx" ON "OutboxEvent"("clinicId");
CREATE INDEX "OutboxEvent_eventName_idx" ON "OutboxEvent"("eventName");
