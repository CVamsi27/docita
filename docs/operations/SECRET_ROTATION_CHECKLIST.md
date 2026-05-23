# Secret rotation checklist (S2)

Operational runbook for rotating credentials referenced in `.env.example`. Code changes are not required for rotation itself.

## Before rotation

- [ ] Schedule a maintenance window if JWT or DB rotation causes brief auth churn.
- [ ] Confirm staging mirrors `main` and smoke tests pass.
- [ ] Export current Render/Fly/Cloudflare secret versions (for rollback).

## Rotate (in order)

1. **`DATABASE_URL`** — create new DB role/password or provider credential; update Render/Fly; run `pnpm --filter @workspace/db run db:migrate:status` against staging.
2. **`JWT_SECRET`** (min 32 chars) — generate new secret; deploy API; all users re-login (access tokens invalidated).
3. **`ENCRYPTION_KEY`** (64-char hex) — only with a documented re-encryption plan for fields encrypted at rest.
4. **`NEXT_PUBLIC_API_URL`** — verify app/internal proxy and CORS allowlists after origin changes.
5. Third-party keys (Razorpay, WhatsApp, S3/R2, Sentry) — rotate in provider console; update platform secrets; verify webhooks still verify signatures.

## After rotation

- [ ] `pnpm deploy:startup-smoke` (or production smoke workflow) green.
- [ ] Clinician login + refresh flow on staging.
- [ ] Worker processes jobs (subscription tick, PDF queue) without auth errors.
- [ ] Revoke old credentials at the provider.

## Never commit

Live values belong in the deployment secret store only. `.env` stays gitignored.
