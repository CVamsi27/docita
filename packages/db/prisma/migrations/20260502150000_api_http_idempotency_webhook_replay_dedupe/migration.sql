-- HTTP idempotency records (multi-replica safe) and webhook replay dedupe

CREATE TYPE "ApiHttpIdempotencyStatus" AS ENUM ('PROCESSING', 'COMPLETED');

CREATE TABLE "ApiHttpIdempotencyRecord" (
  "id"                  TEXT                         NOT NULL,
  "scopedKey"           TEXT                         NOT NULL,
  "bodyHash"            TEXT                         NOT NULL,
  "status"              "ApiHttpIdempotencyStatus"   NOT NULL,
  "response"            JSONB,
  "processingExpiresAt" TIMESTAMP(3)               NOT NULL,
  "recordExpiresAt"     TIMESTAMP(3)               NOT NULL,
  "createdAt"           TIMESTAMP(3)               NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3)               NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ApiHttpIdempotencyRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApiHttpIdempotencyRecord_scopedKey_key"
  ON "ApiHttpIdempotencyRecord" ("scopedKey");

CREATE INDEX "ApiHttpIdempotencyRecord_recordExpiresAt_idx"
  ON "ApiHttpIdempotencyRecord" ("recordExpiresAt");

CREATE INDEX "ApiHttpIdempotencyRecord_status_processingExpiresAt_idx"
  ON "ApiHttpIdempotencyRecord" ("status", "processingExpiresAt");

CREATE TABLE "WebhookReplayDedupe" (
  "id"            TEXT           NOT NULL,
  "dedupeKeyHash" TEXT           NOT NULL,
  "expiresAt"     TIMESTAMP(3)   NOT NULL,
  "createdAt"     TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WebhookReplayDedupe_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WebhookReplayDedupe_dedupeKeyHash_key"
  ON "WebhookReplayDedupe" ("dedupeKeyHash");

CREATE INDEX "WebhookReplayDedupe_expiresAt_idx"
  ON "WebhookReplayDedupe" ("expiresAt");
