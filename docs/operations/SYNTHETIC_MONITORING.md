# Synthetic uptime monitoring

> **Status**: implemented (2026-05-29). Probes run on a 3×/day schedule via
> [`.github/workflows/synthetic-monitoring.yml`](../../.github/workflows/synthetic-monitoring.yml)
> and after each production API deploy.

## Goal

Detect end-to-end breakage of the highest-stakes user flows **before** users
notice. Probe failures fail CI, emit a Sentry event when `SENTRY_DSN` is set,
and trigger GitHub notification emails for repository watchers.

## Targets

| Flow         | Probe                                                           | Target                                | Allowed latency                                             |
| ------------ | --------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------- |
| API liveness | `GET /api/health/live` (version-neutral)                        | 200 + `status: ok`                    | 5 s (3 attempts, 5 s apart, when not post-deploy)           |
| Auth chrome  | `GET /api/v1/public/daily-thought` (app origin, proxied to API) | 200 + quote + `Cache-Control: public` | 5 s                                                         |
| Staff login  | `POST /api/v1/auth/login` (optional creds)                      | 2xx + `access_token` cookie           | 5 s (3 attempts when scheduled; skipped if liveness failed) |

Public booking and patient-portal OTP probes remain in the backlog until
synthetic clinic credentials are provisioned (see Open items).

## Probe runner

- **Script:** [`scripts/monitoring/synthetic/run-probes.mjs`](../../scripts/monitoring/synthetic/run-probes.mjs)
- **Local / CI:** `pnpm monitor:synthetic`
- **Scheduled:** GitHub Actions cron at `0 3,9,14 * * *` UTC — 3×/day at 8:30 AM, 2:30 PM, and 7:30 PM IST, inside the window where `scale-api-hours.yml` keeps the API machine running (outside it the API is intentionally scaled to 0)
- **Post-deploy:** runs in [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) after Fly blue-green deploy

## Alerting

| Signal                          | Behavior                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any probe failure (scheduled)   | Workflow fails → GitHub email to watchers; optional Sentry error via `SENTRY_DSN`; optional Slack/PagerDuty webhook via `OPS_ALERT_WEBHOOK_URL`                                                                                                                                                                                                                                       |
| Post-deploy probe failure       | Blocks deploy job success                                                                                                                                                                                                                                                                                                                                                             |
| Post-deploy warmup              | With `SYNTHETIC_POST_DEPLOY=1`, polls the direct Fly `/api/health/live` endpoint first when `SYNTHETIC_FLY_API_ORIGIN` is set, then the public `/api/health/live` and `/api/health/ready` endpoints (60 s timeout, up to 8 retries each) before probes — wakes the Fly origin before Cloudflare validation and distinguishes origin failures from public-edge failures                |
| Scheduled `api-health-live`     | Up to **3** attempts (15 s timeout each, 5 s between) before failing — tolerates Fly `suspend` wake from GitHub Actions runners                                                                                                                                                                                                                                                       |
| Fly auto-recovery               | When `FLY_API_TOKEN` is set and `api-health-live` fails with an unreachable/frozen signature (timeout, connection refused, `PR01`/no-healthy-instances, 502/503/504/525), the runner issues **one** Fly machine restart, waits for `started`, then re-probes. On success the run passes and posts an informational `Synthetic auto-recovery` webhook; if it still fails it pages normally. No-op without the token or for app-responded failures (latency/payload/4xx). See [`fly-recovery.mjs`](../../scripts/monitoring/synthetic/fly-recovery.mjs). |
| Staff login probe               | **Optional** — skipped unless `SYNTHETIC_MONITOR_EMAIL` + `SYNTHETIC_MONITOR_PASSWORD` are set. Also skipped when `api-health-live` failed in the same run (avoids duplicate Sentry noise). Scheduled runs retry up to 3 times on timeouts/5xx; post-deploy retries up to 4 times. **401/403 are not retried** — fix secrets or unlock the monitor user; disable MFA on that account. |
| WhatsApp stale delivery backlog | API emits `WHATSAPP_DELIVERY_STALE`; `OpsAlertListener` posts to `OPS_ALERT_WEBHOOK_URL` when configured                                                                                                                                                                                                                                                                              |

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
