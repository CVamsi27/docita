# 0011: Use Fly `auto_stop_machines = suspend` for the API cold-start policy

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
`grace_period = '240s'` and keep `min_machines_running = 0`.
Suspended machines snapshot RAM to disk and resume in ~1s on the
next inbound request, so the user-facing wake latency is well
within Cloudflare's origin timeout. The 240s `grace_period` is
the safety net for the rare full cold start (deploy, host
migration, OOM).

## Alternatives considered

| Option | Pros | Cons | Why rejected |
| --- | --- | --- | --- |
| Keep `stop`, raise `grace_period` to 240s | No cost change | Wake still ~3min, Cloudflare gives up before that | Doesn't fix the user-visible 502 |
| `min_machines_running = 1` | Zero cold-start latency | Pay 24/7 for an always-on VM | Not aligned with "pay nothing while idle" intent |
| `auto_stop_machines = 'off'` | Same as min_machines_running=1 | Same | Same |
| Reduce Nest bootstrap to <30s | Fixes the root cause | Multi-week refactor across modules | Pursue in parallel, but not a release blocker |

## Consequences

- Positive:
  - Cloudflare 502s on cold start go away.
  - Idle-period cost stays at $0 CPU.
  - Steady-state wake is ~1s, well within CF origin timeout.
- Negative:
  - Suspended-state storage has a small Fly charge per machine.
  - Suspend does not survive host failover; that still triggers a
    full cold start. The 240s `grace_period` covers it.
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
