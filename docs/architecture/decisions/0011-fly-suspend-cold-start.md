# 0011: Keep one Fly API machine running and suspend scale-out capacity

- **Status**: accepted
- **Date**: 2026-05-26
- **Deciders**: ops
- **Tags**: infra, deployment, cost

## Context

`apps/api` (Fly app `docita-api`) had `auto_stop_machines = 'stop'`
with `min_machines_running = 0`. After an idle period Fly fully
shut the VM down. On the next request Fly auto-started the machine,
but Fly's HTTP proxy only waits ~10-15s for the upstream to bind
`:3001`. Nest bootstrap was taking ~3 minutes (most of which is
`NestFactory.create` instantiating the full module graph; the
database probe runs after `app.listen` and is not the blocker).
The proxy gave up, Cloudflare emitted `502 Bad Gateway`, and the
user observed an outage on every cold start. See
`SYSTEM_DESIGN_AND_PATTERNS.md` §28.5 for the broader operability
gap this surfaced.

## Decision

Switch `apps/api` to `auto_stop_machines = 'suspend'` with
`grace_period = '240s'` and keep `min_machines_running = 1`.
The running floor keeps the steady-state clinician request path
available. Any scale-out machines can still suspend when idle and
resume without a full container boot. The 240s `grace_period` is
the safety net for deploys, host migration, and OOM recovery.

## Alternatives considered

| Option | Pros | Cons | Why rejected |
| --- | --- | --- | --- |
| Keep `stop`, raise `grace_period` to 240s | No cost change | Wake still ~3min, Cloudflare gives up before that | Doesn't fix the user-visible 502 |
| `min_machines_running = 0` | Lowest idle cost | Repeated production liveness timeouts after idle wake | Rejected for the production clinician path |
| `auto_stop_machines = 'off'` | Keep every scaled machine running | Higher idle cost after scale-out | Keep suspend for capacity above the running floor |
| Reduce Nest bootstrap to <30s | Fixes the root cause | Multi-week refactor across modules | Pursue in parallel, but not a release blocker |

## Consequences

- Positive:
  - Cloudflare 502s on cold start go away.
  - Clinician traffic no longer depends on an idle wake.
  - Scale-out capacity can still suspend when idle.
- Negative:
  - One API VM remains billable while production is active.
  - Host failover can still trigger recovery. The 240s
    `grace_period` covers it.
  - Hides the underlying ~3-minute `NestFactory.create` problem.
- Follow-up:
  - Bootstrap-timing instrumentation in `apps/api/src/main.ts`
    captures per-phase timings so the next full cold start gives
    us data to chase the slow module.
  - Track the cold-start reduction in
    `SYSTEM_DESIGN_AND_PATTERNS.md` §28.5.

## References

- Files: `fly.toml`, `apps/api/src/main.ts:bootstrap`
- Related ADRs:
  [0002](./0002-opennext-on-cloudflare.md),
  [0009](./0009-vercel-retired.md)
