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
| API liveness | `GET /api/health/live` (version-neutral) | 200 + `status: ok` | 2 s |
| Auth chrome | `GET /api/daily-thought` (app origin) | 200 + quote + `Cache-Control: public` | 3 s |
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
| Any probe failure (scheduled) | Workflow fails → GitHub email to watchers; optional Sentry error via `SENTRY_DSN` |
| Post-deploy probe failure | Blocks deploy job success |
| Staff login probe | Skipped unless `SYNTHETIC_MONITOR_EMAIL` + `SYNTHETIC_MONITOR_PASSWORD` secrets are set |

Configure Sentry alert rules in the Sentry dashboard for events tagged
`source=synthetic-monitoring` to page on-call.

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
- Optional Slack webhook for warn vs page thresholds (2 vs 5 consecutive failures).
