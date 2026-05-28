# 0001: Use Postgres as the durable queue

- **Status**: accepted
- **Date**: 2025-09-01
- **Deciders**: platform
- **Tags**: backend, infra, data

## Context

The API and worker need a durable job queue for emails, WhatsApp, PDF
generation, OCR, audit fan-out. Options were Redis/BullMQ, NATS JetStream,
SQS, and "use the database we already have."

Operational reality: we already run a managed Postgres on Render and pay
its HA bill. Adding Redis as a hard dependency means another managed
service, another networked failure mode, and another secret to rotate.

## Decision

Use a Postgres-backed queue (`Job`, `JobAttempt` tables in
`packages/db/prisma/schema/communication-session-models.prisma`) with
`SELECT ... FOR UPDATE SKIP LOCKED` for pop-and-claim.

## Alternatives considered

| Option | Pros | Cons | Why rejected |
| --- | --- | --- | --- |
| Redis + BullMQ | Mature, fast, retries built in | Extra service, no transaction with Postgres writes | Adds ops surface; we don't need <10ms enqueue |
| NATS JetStream | Cross-pod fan-out, durable | Significant ops + learning curve | Premature for one-region single-tenant API |
| AWS SQS | Managed, cheap | Vendor lock, no transactional enqueue with our DB | We're not on AWS for primary infra |

## Consequences

- Positive: transactional enqueue (`prisma.$transaction` covers job emit +
  business write), one less moving part, easier local dev.
- Negative: not suitable for very high throughput (>1k/sec sustained);
  if we hit that, we revisit.
- Follow-up: §28.2 item 12 — add a true outbox table to decouple emission
  from request lifecycle. See ADR [0010](0010-transactional-outbox.md).

## References

- `apps/api/src/shared/modules/queue/`
- `apps/worker/src/processors/`
- `SYSTEM_DESIGN_AND_PATTERNS.md` §14
