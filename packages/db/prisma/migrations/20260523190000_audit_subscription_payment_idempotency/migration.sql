-- Audit FL11 (2026-05-23): enforce idempotency on Razorpay subscription
-- payments at the schema level.
--
-- `razorpayPaymentId` is optional (manual subscriptions have NULL). In
-- Postgres a UNIQUE constraint on a nullable column permits multiple NULLs
-- but rejects duplicate non-NULL values — which is exactly the contract
-- we want: a single Razorpay payment id can map to at most one
-- SubscriptionPayment row.
--
-- The existing `@@index([razorpayPaymentId])` is dropped because a UNIQUE
-- index already provides the same lookup path.
--
-- If this migration fails on apply, the existing data contains duplicate
-- razorpayPaymentId rows that represent a real integrity bug — surface it
-- and resolve operationally before retrying. Do not weaken the constraint.

DROP INDEX IF EXISTS "SubscriptionPayment_razorpayPaymentId_idx";

CREATE UNIQUE INDEX "SubscriptionPayment_razorpayPaymentId_key"
  ON "SubscriptionPayment"("razorpayPaymentId");
