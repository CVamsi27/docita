# 0007: KEK rotation cadence and tooling

- **Status**: proposed
- **Date**: 2026-05-26
- **Deciders**: security, platform
- **Tags**: backend, security, compliance

## Context

Envelope encryption (ADR [0005](0005-envelope-encryption-for-phi.md))
supports KEK rotation by re-wrapping DEKs without re-encrypting payloads.
Today, rotation is manual: change `ENCRYPTION_KEY`, re-wrap on each read.
No automated cadence, no overlap window.

## Decision

1. Introduce `ENCRYPTION_KEK_VERSIONS` env (JSON list of `{version, key}`)
   so old and new KEKs can both unwrap during a window.
2. Add a scheduled re-wrap job in
   `apps/api/src/shared/modules/encryption/kek-rewrap.scheduler.ts` that
   batches re-wraps of old-version DEKs over time.
3. Rotation cadence: every 12 months by default; ad-hoc on incident.

## Consequences

- Positive: rotation becomes a config + deploy, not a downtime event.
- Negative: must keep the previous KEK reachable until re-wrap completes.
- Follow-up: incident playbook entry for "suspected KEK compromise."

## References

- `SYSTEM_DESIGN_AND_PATTERNS.md` §28.1 item 8
- `docs/operations/KEY_ROTATION.md`
