/**
 * Transactional Outbox interface.
 *
 * See ADR docs/architecture/decisions/0010-transactional-outbox.md and
 * SYSTEM_DESIGN_AND_PATTERNS.md §28.2 items 11, 12.
 *
 * Producers in command paths call `outbox.append(...)` inside the
 * same `prisma.$transaction(...)` as the business write. A relay
 * scheduler (`apps/api/src/shared/modules/outbox/outbox-relay.scheduler.ts`)
 * polls unpublished rows and republishes via the in-process EventEmitter2.
 */
import type { Prisma } from '@workspace/db';

export interface OutboxAppend {
  /** Domain event name (e.g., "appointment.created"). */
  eventName: string;
  /** Tenant identifier so the relay can re-establish ALS context. */
  clinicId: string | null;
  /** Optional aggregate-type label (e.g., "Appointment"). */
  aggregateType?: string;
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
