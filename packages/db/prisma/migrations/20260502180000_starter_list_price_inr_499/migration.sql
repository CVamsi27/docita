-- Align Starter catalog list price in paise with product pricing (INR 499).
-- Does not create SubscriptionPayment rows; use checkout for new charges.
UPDATE "Subscription"
SET "basePriceCents" = 49900
WHERE plan = 'STARTER'
  AND "basePriceCents" = 0;
