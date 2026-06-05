# Secret rotation checklist (S2)

Operational runbook for rotating credentials referenced in `.env.example`. Code changes are not required for rotation itself.

## Before rotation

- [ ] Schedule a maintenance window if JWT or DB rotation causes brief auth churn.
- [ ] Confirm staging mirrors `main` and smoke tests pass.
- [ ] Export current RDS/Render-staging/Fly/Cloudflare secret versions (for rollback).

## Rotate (in order)

1. **`DATABASE_URL`** — create new DB role/password or provider credential; update Fly production and Render staging; run `pnpm --filter @workspace/db run db:migrate:status` against staging.
2. **`JWT_SECRET`** (min 32 chars) — generate new secret; deploy API; all users re-login (access tokens invalidated).
3. **`ENCRYPTION_KEY`** (64-char hex) — only with a documented re-encryption plan for fields encrypted at rest.
4. **`NEXT_PUBLIC_API_URL`** — verify app/internal proxy and CORS allowlists after origin changes.
5. Third-party keys (Razorpay, WhatsApp, S3/R2, Sentry) — rotate in provider console; update platform secrets; verify webhooks still verify signatures.

## After rotation

- [ ] `pnpm deploy:startup-smoke` (or production smoke workflow) green.
- [ ] Clinician login + refresh flow on staging.
- [ ] Worker processes jobs (subscription tick, PDF queue) without auth errors.
- [ ] Revoke old credentials at the provider.

## Provider-specific verification

- [ ] **Razorpay** — fire a test `payment.captured` webhook from the dashboard against staging; confirm `WebhooksController` returns 200 and the event is recorded in `webhook-events`. If the rotation was on the webhook secret specifically, signature verification must succeed *and* the new value must match what production receives.
- [ ] **Meta / WhatsApp** — send a template message from the staging clinic; confirm no `usage_tracking_failed` log fires and the message lands in the recipient inbox. If `META_BUSINESS_ACCOUNT_ID` rotates, re-onboard message templates that were registered against the old account id.
- [ ] **Zeptomail** — trigger a password-reset email from staging; confirm it is delivered (not bounced). Verify the new SMTP password works for both transactional and broadcast templates.
- [ ] **S3 / R2** — upload an avatar through staging; confirm the new credentials produce a working signed URL and that previously-uploaded objects remain readable. Do not rotate the bucket name in the same step — that requires a migration.
- [ ] **Sentry** — verify the staging app's first error after rotation lands in the project (check `event_id` returned by `Sentry.captureException`).

## Rollback procedure (partial rotation failure)

If post-rotation verification fails for one key but the others succeeded:

1. Do not revert all keys — that compounds the blast radius.
2. Restore only the failed key from the previous version stored in the secrets manager.
3. Redeploy the affected app/worker. Smoke-test the affected provider only.
4. If `ENCRYPTION_KEY` is the one that failed and any data was already written under the new key, do not roll back — promote the new key to the next `ENCRYPTION_KEY_V<N+1>` slot (see `KEY_ROTATION.md`) and resume.
5. Open a follow-up incident ticket noting which key, why verification failed, and what was retained.

## Legacy env-var aliases

A few historical env-var names are still accepted via runtime shims for deployments that predate a rename. Remove the shim once every deployment is on the new name.

| Old name | New name | Shim location | Status |
|---|---|---|---|
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | `META_BUSINESS_ACCOUNT_ID` | `apps/api/src/shared/modules/config/app-config.ts` (validateEnv) | Documented 2026-05-23; scheduled for removal at the next major rotation cycle. |

## Never commit

Live values belong in the deployment secret store only. `.env` stays gitignored.
