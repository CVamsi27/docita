# 0010: Add a transactional Outbox for cross-pod events

- **Status**: accepted
- **Date**: 2026-05-27 (originally proposed 2026-05-26)
- **Deciders**: platform, backend
- **Tags**: backend, architecture, reliability

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
`prisma.$transaction` as the business write. A relay scheduler
([`outbox-relay.scheduler.ts`](../../../apps/api/src/shared/modules/outbox/outbox-relay.scheduler.ts))
polls unpublished
rows and republishes to the in-process `EventEmitter2` (initially) or
to Postgres `LISTEN/NOTIFY` for cross-pod fan-out (later).

Replace direct `emit(...)` calls in **command-path** code with
`outbox.append(...)`. Pure read-side events (telemetry, analytics)
may stay direct.

## Alternatives considered

| Option         | Pros              | Cons                       | Why rejected              |
| -------------- | ----------------- | -------------------------- | ------------------------- |
| NATS JetStream | Mature broker     | New ops surface, new dep   | Premature                 |
| Kafka          | Strong durability | Massive ops overhead       | Overkill at our scale     |
| Stay direct    | Simplest          | Loses on retry + multi-pod | Doesn't solve the problem |

## Consequences

- Positive: atomic emit with the business write; relay can retry; replay
  story exists (`SELECT * FROM Outbox WHERE publishedAt IS NULL`).
- Negative: one extra table + scheduler; latency between commit and emit
  is bounded by relay poll interval (target: <1s).
- Follow-up: `scripts/checks/check-event-emit-via-outbox.mjs` (Stream O)
  enforces no direct `emit` in command paths.

## Implementation shape

The model lands as:

```prisma
model OutboxEvent {
  id              String    @id @default(cuid())
  eventName       String
  aggregateType   String?
  aggregateId     String?
  clinicId        String?
  payload         Json
  idempotencyKey  String?   @unique
  createdAt       DateTime  @default(now())
  processedAt     DateTime?
  attempts        Int       @default(0)
  lastError       String?
  nextAttemptAt   DateTime?
  lastAttemptAt   DateTime?

  @@index([processedAt, createdAt])
  @@index([clinicId])
}
```

`idempotencyKey @unique` collapses duplicate `append` calls (retried
webhooks, retried commands) into a single row, giving producer-side
exactly-once. The relay marks `processedAt` on successful dispatch; on
failure the atomic claim has already incremented `attempts`; the relay writes
`lastError` and schedules `nextAttemptAt` with bounded exponential backoff.
After the attempt ceiling the row remains available for the outbox alerting
and operator-drain path.

## Follow-up: migrate existing direct emits to outbox

Ten command-path sites currently carry `allow-direct-emit:` markers (recorded
2026-05-27). Each note documents why the emit is acceptable today and what
would change if it moved to the outbox. These sites can adopt the outbox
incrementally as the surrounding use-cases are refactored to participate in a
single `runInTransaction(...)` block:

- `apps/api/src/domains/appointments/application/services/appointment-command.service.ts` (`APPOINTMENT_CREATED`)
- `apps/api/src/domains/appointments/application/services/doctor-delay.service.ts` (`DOCTOR_DELAY_MARKED`)
- `apps/api/src/domains/appointments/application/use-cases/update-appointment-details.use-case.ts` (`APPOINTMENT_COMPLETED`)
- `apps/api/src/domains/billing/application/services/invoices-command.service.ts` (`INVOICE_GENERATED`)
- `apps/api/src/domains/prescriptions/application/services/prescriptions-command.service.ts` (`PRESCRIPTION_CREATED`)
- `apps/api/src/domains/whatsapp/application/use-cases/send-message.use-case.ts` (`WHATSAPP_MESSAGE_SENT`)
- `apps/api/src/domains/whatsapp/application/services/staff-notification-inbox.service.ts` × 4 (`NOTIFICATION_READ` / `_DELETED` / `_BULK_DELETED` / `_CREATED`) — these are real-time websocket fan-outs that intentionally stay direct; the staff-inbox list query is the source of truth, so a lost emit is recovered on the next refresh.

## References

- `SYSTEM_DESIGN_AND_PATTERNS.md` §28.2 items 11, 12
- ADR [0001](0001-postgres-as-queue.md)
