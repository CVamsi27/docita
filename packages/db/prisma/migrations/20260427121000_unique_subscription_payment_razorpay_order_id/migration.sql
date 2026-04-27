-- Add uniqueness for Razorpay order references on subscription payments.
-- Postgres UNIQUE indexes allow multiple NULLs, so this is safe for rows without an order id.
CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPayment_razorpayOrderId_key"
ON "SubscriptionPayment" ("razorpayOrderId");

