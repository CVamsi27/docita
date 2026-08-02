# Playbook: Razorpay outage

## Detection signals

- `RazorpayClient` 5xx rate > 5% in `apps/api` logs.
- Webhook `signature.verified=false` rate spike (often due to
  Razorpay-side incidents emitting malformed callbacks).
- Sentry breadcrumbs around `RazorpayAdapter` show timeouts.
- Customer reports: "payment link not loading" or "subscription not
  activating."

## First 5 minutes

1. Confirm scope at [status.razorpay.com](https://status.razorpay.com).
2. Check our error envelope distribution:
   ```
   fly logs -a <api-app> | grep -E "razorpay" | tail -200
   ```
3. Confirm webhook signature secrets are not the cause (a recent
   rotation may explain `signature.verified=false`):
   ```
   fly ssh console -a <api-app> -C 'env | grep RAZORPAY'
   ```

## Mitigation

- **Server-side**: ensure the Razorpay adapter has timeouts set
  (`check-external-http-timeouts.mjs` enforces this). Verify retries
  use exponential backoff and stop at the documented attempt cap.
- **Customer messaging**: enable the "Payments degraded" banner via
  `apps/internal-vite` (feature flag `paymentsDegraded`). Patients see a
  retry message instead of a confusing failure.
- **Queue back-pressure**: pause the
  `razorpay-webhook-replay.scheduler.ts` cron so we don't replay
  webhooks while upstream is dead — replay them after recovery.
- **Subscription side-effects**: confirm Stream M's DLQ replay is
  enabled. Failed activations should retry once Razorpay recovers.

## Validation

- Razorpay status: green or degraded-recovering.
- Our 5xx rate to Razorpay drops below 1%.
- A test payment link (smoke test patient) completes end to end.

## Rollback criteria

- If we disabled the webhook-replay scheduler, re-enable it after
  Razorpay status returns to green.
- If the degraded banner was shown, remove it once 30 minutes have
  passed with healthy traffic.

## Post-incident

- Verify all webhook callbacks for the outage window were eventually
  processed (idempotency key + `Outbox`/job ledger).
- Reconcile subscription state: run
  `apps/api/src/shared/modules/subscriptions/reconcile.scheduler.ts`
  one-shot.
- File an issue for any missing webhook deliveries.
