/**
 * Transactional Outbox interface.
 *
 * See ADR docs/architecture/decisions/0010-transactional-outbox.md and
 * SYSTEM_DESIGN_AND_PATTERNS.md §28.2 items 11, 12.
 *
 * Producers in command paths call `outbox.append(...)` inside the
 * same `prisma.$transaction(...)` as the business write. A relay
 * worker (`apps/worker/src/processors/outbox.processor.ts`) polls
 * unpublished rows and republishes via the in-process EventEmitter2
 * (initial implementation) or LISTEN/NOTIFY (later, for cross-pod
 * fan-out).
 *
 * The Prisma model `Outbox` is provisioned in a follow-up migration;
 * the interface here ships first so command-path code can be wired in
 * preparation. Until the model exists, `NoopOutboxService` is bound,
 * which behaves like the existing direct emit.
 */
import type { Prisma } from '@workspace/db';

export interface OutboxAppend {
  /** Domain event name (e.g., "appointment.created"). */
  eventName: string;
  /** Tenant identifier so the relay can re-establish ALS context. */
  clinicId: string | null;
  /** Optional identifier for the aggregate this event refers to. */
  aggregateId?: string;
  /** Serializable JSON payload. Must NOT contain PHI in plaintext. */
  payload: Prisma.JsonValue;
  /** Idempotency key for duplicate-emit detection. */
  idempotencyKey?: string;
}

export interface IOutboxService {
  /**
   * Append an event to the outbox. MUST be called inside a Prisma
   * transaction; the relay assumes commit-once semantics.
   *
   * @param tx Prisma transactional client.
   * @param event Event description.
   */
  append(tx: Prisma.TransactionClient, event: OutboxAppend): Promise<void>;
}
