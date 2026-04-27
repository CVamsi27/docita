-- Persist platform-level operational alerts for admin notifications.

CREATE TABLE IF NOT EXISTS "PlatformAlert" (
  "id" TEXT NOT NULL,
  "alertKey" TEXT NOT NULL,
  "environment" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastNotifiedAt" TIMESTAMP(3),
  "recoveredAt" TIMESTAMP(3),
  "metadata" JSONB,

  CONSTRAINT "PlatformAlert_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlatformAlert_alertKey_environment_key"
  ON "PlatformAlert"("alertKey", "environment");

CREATE INDEX IF NOT EXISTS "PlatformAlert_environment_status_lastSeenAt_idx"
  ON "PlatformAlert"("environment", "status", "lastSeenAt");

CREATE INDEX IF NOT EXISTS "PlatformAlert_alertKey_environment_idx"
  ON "PlatformAlert"("alertKey", "environment");

