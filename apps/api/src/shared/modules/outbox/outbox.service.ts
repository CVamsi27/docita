// check-as-cast-density: allow-file — Prisma.JsonValue is a wide union; narrowing before spread adds noise at the boundary.
/**
 * Transactional outbox.
 *
 * Producers in command paths call `outbox.append(tx, ...)` inside the
 * same `prisma.$transaction(...)` as the business write. The relay worker
 * (`apps/worker/src/processors/outbox.processor.ts`) drains unprocessed
 * rows via `EventEmitter2` and marks `processedAt`.
 *
 * See ADR docs/architecture/decisions/0010-transactional-outbox.md.
 */
import { Injectable } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import type { Prisma } from '@workspace/db';
import type { IOutboxService, OutboxAppend } from './outbox.interface';

@Injectable()
export class OutboxService implements IOutboxService {
  constructor(private readonly logger: Logger) {}

  async append(
    tx: Prisma.TransactionClient,
    event: OutboxAppend,
  ): Promise<void> {
    try {
      await tx.outboxEvent.create({
        data: {
          eventName: event.eventName,
          aggregateType: event.aggregateType ?? null,
          aggregateId: event.aggregateId ?? null,
          clinicId: event.clinicId,
          payload: event.payload as Prisma.InputJsonValue,
          idempotencyKey: event.idempotencyKey ?? null,
        },
      });
    } catch (error) {
      // P2002 on idempotencyKey means a previous emit for the same logical
      // event has already been recorded. Treat as a no-op so retries are safe.
      const code = (error as { code?: string } | null)?.code;
      if (event.idempotencyKey && code === 'P2002') {
        this.logger.debug(
          `[outbox] duplicate idempotencyKey ${event.idempotencyKey} for ${event.eventName} — already recorded`,
        );
        return;
      }
      throw error;
    }
  }
}
