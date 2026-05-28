# 0006: Single-region Postgres for now

- **Status**: accepted (revisit when load demands)
- **Date**: 2025-09-22
- **Deciders**: platform
- **Tags**: backend, data, infra

## Context

DPDP "significant data fiduciary" provisions encourage Indian-region
hosting. Multi-region active-active Postgres has significant complexity
(conflict resolution, replication lag, RLS interactions).

## Decision

Run one Postgres primary in an Indian region with managed PITR + daily
snapshots. R2 (object storage) is multi-region with jurisdiction-aware
bucket policies.

## Alternatives considered

| Option | Pros | Cons | Why rejected |
| --- | --- | --- | --- |
| Multi-region read replicas | Lower read latency abroad | Replication lag complicates "read after write" semantics | Not justified by user geography |
| Aurora Global / Spanner | Strong consistency multi-region | Significant cost + vendor lock | Premature |

## Consequences

- Positive: simpler operations, clean DPDP locality story.
- Negative: a region outage is a downtime event (no warm DR yet). §27.4
  documents the gap; §28.1 item 7 tracks the runbook.
- Follow-up: write the DR runbook, run a quarterly drill.

## References

- `SYSTEM_DESIGN_AND_PATTERNS.md` §27.4
- `docs/operations/DR_RUNBOOK.md` (added 2026-05; see Stream L)
