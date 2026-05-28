# Synthetic uptime monitoring

> **Status**: design only. SYSTEM_DESIGN_AND_PATTERNS.md §28.5 item 38.

## Goal

Detect end-to-end breakage of the two highest-stakes user flows
**before** users notice. Anything that breaks these is an immediate page
to on-call.

## Targets

| Flow | Probe | Target | Allowed latency |
| --- | --- | --- | --- |
| Public booking | `GET https://app.docita.work/book/<known-test-referral>` | 200 + DOM contains "Book your appointment" | 2 s |
| Staff login | `POST /api/v1/auth/login` with synthetic creds → expect 200 + valid JWT cookie | 2xx + non-empty `Set-Cookie` | 1.5 s |
| Patient-portal OTP request | `POST /api/v1/portal/auth/request-otp` (test phone) | 2xx | 1.5 s |
| Daily-thought (auth chrome) | `GET /api/daily-thought` | 200 + Cache-Control: public | 1 s |

## Probe runner

External pinger options (in order of preference):

1. **Cloudflare Workers** scheduled trigger (cron) hitting the probes
   and emitting custom metrics to Sentry / observability.
2. **Self-hosted on Fly.io** as a tiny worker — preferred if we want
   Indian-region locality for the probe.
3. **Third-party** (Better Uptime, BetterStack) — fastest to set up,
   but external dependency.

## Synthetic test credentials

- Test clinic `synthetic-clinic-do-not-delete` with role `DOCTOR`.
- Test phone number reserved for OTP probes (no real SMS sent;
  OTP gateway in test-mode delivers via the `MOCK_OTP_RECEIVER` env).
- Synthetic billing rows excluded from analytics aggregates via
  `clinic.isSynthetic = true` (already in the schema).

## Alerting

- 2 consecutive failures → warn (Slack channel).
- 5 consecutive failures (within 5 minutes) → page on-call.
- Probe latency > 2× target for 10 minutes → warn.

## Validation

Add `scripts/monitoring/synthetic/booking-flow.mjs` and
`scripts/monitoring/synthetic/staff-login.mjs` as the reference probes.
Run them locally with `pnpm tsx` once the synthetic credentials exist.

## Open items

- Provision the synthetic clinic + user (one-time migration).
- Decide between Cloudflare Workers vs Fly.io worker for the runner.
- Wire failure events into the on-call rotation.
