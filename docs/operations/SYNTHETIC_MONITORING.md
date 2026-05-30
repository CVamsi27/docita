# Synthetic uptime monitoring

> **Status**: implemented (2026-05-29). Probes run every 5 minutes via
> [`.github/workflows/synthetic-monitoring.yml`](../../.github/workflows/synthetic-monitoring.yml)
> and after each production API deploy.

## Goal

Detect end-to-end breakage of the highest-stakes user flows **before** users
notice. Probe failures fail CI, emit a Sentry event when `SENTRY_DSN` is set,
and trigger GitHub notification emails for repository watchers.

## Targets

| Flow | Probe | Target | Allowed latency |
| --- | --- | --- | --- |
| API liveness | `GET /api/health/live` (version-neutral) | 200 + `status: ok` | 5 s (3 attempts, 5 s apart, when not post-deploy) |
| Auth chrome | `GET /api/v1/public/daily-thought` (app origin, proxied to API) | 200 + quote + `Cache-Control: public` | 5 s |
| Staff login | `POST /api/v1/auth/login` (optional creds) | 2xx + `access_token` cookie | 1.5 s |

Public booking and patient-portal OTP probes remain in the backlog until
synthetic clinic credentials are provisioned (see Open items).

## Probe runner

- **Script:** [`scripts/monitoring/synthetic/run-probes.mjs`](../../scripts/monitoring/synthetic/run-probes.mjs)
- **Local / CI:** `pnpm monitor:synthetic`
- **Scheduled:** GitHub Actions cron every 5 minutes
- **Post-deploy:** runs in [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) after Fly blue-green deploy

## Alerting

| Signal | Behavior |
| --- | --- |
| Any probe failure (scheduled) | Workflow fails → GitHub email to watchers; optional Sentry error via `SENTRY_DSN`; optional Slack/PagerDuty webhook via `OPS_ALERT_WEBHOOK_URL` |
| Post-deploy probe failure | Blocks deploy job success |
| Post-deploy warmup | With `SYNTHETIC_POST_DEPLOY=1`, polls `/api/health/live` then `/api/health/ready` (60 s timeout, up to 8 retries each) before probes — handles Fly suspend cold starts and DB readiness |
| Scheduled `api-health-live` | Up to **3** attempts (15 s timeout each, 5 s between) before failing — tolerates Fly `suspend` wake from GitHub Actions runners |
| Staff login probe | **Optional** — skipped (does not fail the run) unless `SYNTHETIC_MONITOR_EMAIL` + `SYNTHETIC_MONITOR_PASSWORD` GitHub secrets are set. Password is trimmed; post-deploy retries login up to 4 times. On 401, verify secrets match the production monitor user (no trailing whitespace; account not locked). |
| WhatsApp stale delivery backlog | API emits `WHATSAPP_DELIVERY_STALE`; `OpsAlertListener` posts to `OPS_ALERT_WEBHOOK_URL` when configured |

Configure Sentry alert rules in the Sentry dashboard for events tagged
`source=synthetic-monitoring` to page on-call. Set `OPS_ALERT_WEBHOOK_URL` in
Fly secrets (API) and GitHub Actions (synthetic workflow) for Slack/PagerDuty
routing.

## Validation

```bash
pnpm monitor:synthetic
```

With optional staff login:

```bash
SYNTHETIC_MONITOR_EMAIL=... SYNTHETIC_MONITOR_PASSWORD=... pnpm monitor:synthetic
```

## Open items

- Provision synthetic clinic + dedicated monitor user; enable booking/OTP probes.
- Wire PagerDuty escalation on top of `OPS_ALERT_WEBHOOK_URL` (scaffold shipped 2026-05-30).
