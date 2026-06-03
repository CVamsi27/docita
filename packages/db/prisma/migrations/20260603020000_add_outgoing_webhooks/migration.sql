-- Add outgoing webhook subscription and delivery tracking models.
--
-- WebhookSubscription stores subscriber endpoints per clinic per event type.
-- OutgoingWebhookDelivery tracks each delivery attempt with status, retry
-- count, and exponential backoff scheduling.

CREATE TABLE "WebhookSubscription" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "signingSecret" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WebhookSubscription_clinicId_eventName_targetUrl_key" UNIQUE ("clinicId", "eventName", "targetUrl")
);

CREATE TYPE "WebhookDeliveryStatus" AS ENUM ('PENDING', 'IN_FLIGHT', 'DELIVERED', 'FAILED', 'DEAD_LETTERED');

CREATE TABLE "OutgoingWebhookDelivery" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastStatusCode" INTEGER,
    "lastError" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "scheduledAt" TIMESTAMPTZ(3),
    "completedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "OutgoingWebhookDelivery_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OutgoingWebhookDelivery_idempotencyKey_key" UNIQUE ("idempotencyKey")
);

CREATE INDEX "OutgoingWebhookDelivery_status_scheduledAt_idx" ON "OutgoingWebhookDelivery" ("status", "scheduledAt");
CREATE INDEX "OutgoingWebhookDelivery_clinicId_idx" ON "OutgoingWebhookDelivery" ("clinicId");
CREATE INDEX "OutgoingWebhookDelivery_subscriptionId_idx" ON "OutgoingWebhookDelivery" ("subscriptionId");
CREATE INDEX "WebhookSubscription_clinicId_idx" ON "WebhookSubscription" ("clinicId");
CREATE INDEX "WebhookSubscription_eventName_idx" ON "WebhookSubscription" ("eventName");
CREATE INDEX "WebhookSubscription_active_idx" ON "WebhookSubscription" ("active");

ALTER TABLE "OutgoingWebhookDelivery" ADD CONSTRAINT "OutgoingWebhookDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "WebhookSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
