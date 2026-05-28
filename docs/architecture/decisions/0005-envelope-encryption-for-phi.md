# 0005: Envelope encryption for PHI columns

- **Status**: accepted
- **Date**: 2025-07-15
- **Deciders**: security
- **Tags**: backend, security, compliance

## Context

DPDP and clinic compliance require encryption at rest beyond what disk-level
encryption provides. Field-level encryption keeps the threat model honest
(stolen DB snapshot is unreadable without the KEK).

## Decision

Implement envelope encryption: each row carries a per-row Data Encryption
Key (DEK) wrapped by the Key Encryption Key (KEK). Wrap/unwrap happens
transparently in `encryption.extension.ts` (§30.2). The PHI field
allowlist lives in `encryption-patient-fields.boundary.ts`.

## Alternatives considered

| Option | Pros | Cons | Why rejected |
| --- | --- | --- | --- |
| Single static key for all rows | Simple | Rotation requires re-encrypting every row | Inefficient at scale |
| Cloud KMS per-row | Strongest isolation | Per-write KMS call cost + latency | Throughput hit |
| App-layer per-column without DEK | Simple | No rotation story | Bad posture |

## Consequences

- Positive: rotation re-wraps DEKs only, never re-encrypts payloads.
- Negative: requires the KEK to be available at runtime (env var).
- Follow-up: §28.1 item 8 — automate KEK rotation cadence. See ADR
  [0007](0007-kek-rotation-cadence.md).

## References

- `apps/api/src/shared/common/extensions/encryption.extension.ts`
- `apps/api/src/shared/common/extensions/encryption-patient-fields.boundary.ts`
- `SYSTEM_DESIGN_AND_PATTERNS.md` §27.2, §30.2
