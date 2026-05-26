# 0010: Add a transactional Outbox for cross-pod events

- **Status**: proposed
- **Date**: 2026-05-26
- **Deciders**: platform
- **Tags**: backend, architecture

## Context

Today, domain events are emitted via in-process `EventEmitter2`
(§3.6, §28.2 item 11). This is fine for single-region single-API-pod, but:

1. Listener failures are logged, not retried (§28.2 item 31).
2. Splitting the API across pods or regions would silently drop
   cross-pod listeners.
3. There is no replay story for missed events.

The queue (ADR [0001](0001-postgres-as-queue.md)) covers job execution
but not domain event fan-out.

## Decision

Introduce a transactional `Outbox` Prisma model written in the same
`prisma.$transaction` as the business write. A relay worker
(`apps/worker/src/processors/outbox.processor.ts`) polls unpublished
rows and republishes to the in-process `EventEmitter2` (initially) or
to Postgres `LISTEN/NOTIFY` for cross-pod fan-out (later).

Replace direct `emit(...)` calls in **command-path** code with
`outbox.append(...)`. Pure read-side events (telemetry, analytics)
may stay direct.

## Alternatives considered

| Option | Pros | Cons | Why rejected |
| --- | --- | --- | --- |
| NATS JetStream | Mature broker | New ops surface, new dep | Premature |
| Kafka | Strong durability | Massive ops overhead | Overkill at our scale |
| Stay direct | Simplest | Loses on retry + multi-pod | Doesn't solve the problem |

## Consequences

- Positive: atomic emit with the business write; relay can retry; replay
  story exists (`SELECT * FROM Outbox WHERE publishedAt IS NULL`).
- Negative: one extra table + worker; latency between commit and emit
  is bounded by relay poll interval (target: <1s).
- Follow-up: `scripts/checks/check-event-emit-via-outbox.mjs` (Stream O)
  enforces no direct `emit` in command paths.

## References

- `SYSTEM_DESIGN_AND_PATTERNS.md` §28.2 items 11, 12
- ADR [0001](0001-postgres-as-queue.md)
