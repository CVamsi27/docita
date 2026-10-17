# Secret rotation checklist (S2)

Operational runbook for rotating credentials referenced in `.env.example`. Code changes are not required for rotation itself.

## Before rotation

- [ ] Schedule a maintenance window if JWT or DB rotation causes brief auth churn.
- [ ] Verify the affected environment's provider project/branch, endpoint, role and every credential consumer. A staging variable name is not isolation proof; follow [STAGING.md](STAGING.md).
- [ ] Rehearse planned rotation and smoke tests on isolated staging. For exposed credentials, use the containment path with fresh login/rejection and runtime verification; do not wait for unrelated staging repair.
- [ ] Record affected platform configuration/image/version identities and keep rollback material only in protected operator storage. Never print credentials or export them into public evidence.
- [ ] Inspect secrets through sanitized comparisons. Browser masking can leave plaintext in DOM/accessibility values; do not capture generic state after revealing a secret. Reload the view before state capture.

## Rotate (in order)

1. **`DATABASE_URL`** — rotate within the verified Neon project/branch and update only its actual consumers. Production Fly API/worker and production migration credentials stay separate from the independent staging project and Render staging login. Never copy a production URL to staging during rotation. Preserve idle settings and keep a stopped worker stopped while updating its secret store. Verify new login and old rejection without printing values, then run migration status against the independently verified staging target.
2. **`JWT_SECRET`** (min 32 chars) — generate a fresh secret and verify it in the restarted API. Previously signed access tokens stop validating; opaque refresh sessions can still renew access unless separately revoked. If document signing used the JWT fallback or an exposed explicit key, rotate `PUBLIC_DOCUMENT_SIGNING_SECRET` to a separate fresh value; existing signed public links will need reissue. Keep stopped workers stopped while applying the new secret version, and preserve the image and idle configuration.
3. **`ENCRYPTION_KEY`** (64-char hex) — only with a documented re-encryption plan for fields encrypted at rest.
4. **`API_PUBLIC_URL`** (legacy alias `NEXT_PUBLIC_API_URL`) — verify app/internal proxy and CORS allowlists after origin changes.
5. Third-party keys (Razorpay, WhatsApp, S3/R2, Sentry) — rotate in provider console; update platform secrets; verify webhooks still verify signatures.

## After rotation

- [ ] `scripts/deploy/test-api-startup.sh` (or `pnpm monitor:synthetic`) green.
- [ ] Clinician login + refresh flow on staging.
- [ ] Worker processes jobs (subscription tick, PDF queue) without auth errors.
- [ ] Revoke old credentials at the provider.

## Provider-specific verification

- [ ] **Razorpay** — fire a test `payment.captured` webhook from the dashboard against staging; confirm `WebhooksController` returns 200 and the event is recorded in `webhook-events`. If the rotation was on the webhook secret specifically, signature verification must succeed _and_ the new value must match what production receives.
- [ ] **Meta / WhatsApp** — send a template message from the staging clinic; confirm no `usage_tracking_failed` log fires and the message lands in the recipient inbox. If `META_BUSINESS_ACCOUNT_ID` rotates, re-onboard message templates that were registered against the old account id.
- [ ] **Zeptomail** — trigger a password-reset email from staging; confirm it is delivered (not bounced). Verify the new SMTP password works for both transactional and broadcast templates.
- [ ] **S3 / R2** — upload an avatar through staging; confirm the new credentials produce a working signed URL and that previously-uploaded objects remain readable. Do not rotate the bucket name in the same step — that requires a migration.
- [ ] **Sentry** — verify the staging app's first error after rotation lands in the project (check `event_id` returned by `Sentry.captureException`).

## Rollback procedure (partial rotation failure)

If post-rotation verification fails for one key but the others succeeded:

1. Do not revert all keys — that compounds the blast radius.
2. For a planned rotation, restore only the failed key from the previous protected version. Never restore an exposed authentication/provider key to service; repair its replacement configuration or generate another replacement. A compromised field key may need temporary retained-key support to recover existing ciphertext, pending authenticated re-encryption and retirement.
3. Redeploy the affected app/worker. Smoke-test the affected provider only.
4. If `ENCRYPTION_KEY` is the one that failed and any data was already written under the new key, do not roll back — promote the new key to the next `ENCRYPTION_KEY_V<N+1>` slot (see `KEY_ROTATION.md`) and resume.
5. Open a follow-up incident ticket noting which key, why verification failed, and what was retained.

## Legacy env-var aliases

A few historical env-var names are still accepted via runtime shims for deployments that predate a rename. Remove the shim once every deployment is on the new name.

| Old name                       | New name                   | Shim location                                                    | Status                                                                         |
| ------------------------------ | -------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `WHATSAPP_BUSINESS_ACCOUNT_ID` | `META_BUSINESS_ACCOUNT_ID` | `apps/api/src/shared/modules/config/app-config.ts` (validateEnv) | Documented 2026-05-23; scheduled for removal at the next major rotation cycle. |

## Never commit

Live values belong in protected operator/deployment secret stores. `.env` stays
gitignored; `.env.example` files must contain placeholders only. Generated
`.open-next` and `dist` artifacts remain ignored. Browser builds must use explicit
public variable allowlists and must never inline the complete server environment.
Verify Gitleaks default rules are enabled and scan the actual publication range;
an ignored current `.env` file does not establish clean historical credentials.
