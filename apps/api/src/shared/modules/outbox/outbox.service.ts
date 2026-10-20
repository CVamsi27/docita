/**
 * Transactional outbox.
 *
 * Producers in command paths call `outbox.append(tx, ...)` inside the
 * same `prisma.$transaction(...)` as the business write. The relay scheduler
 * (`apps/api/src/shared/modules/outbox/outbox-relay.scheduler.ts`) drains unprocessed
 * rows via `EventEmitter2` and marks `processedAt`.
 *
 * See ADR docs/architecture/decisions/0010-transactional-outbox.md.
 */
import { Injectable } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import type { Prisma } from '@workspace/db';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import type { IOutboxService, OutboxAppend } from './outbox.interface';

@Injectable()
export class OutboxService implements IOutboxService {
  constructor(private readonly logger: Logger) {}

  async append(
    tx: Prisma.TransactionClient,
    event: OutboxAppend,
  ): Promise<void> {
    const data = {
      eventName: event.eventName,
      aggregateType: event.aggregateType ?? null,
      aggregateId: event.aggregateId ?? null,
      clinicId: event.clinicId,
      payload: toPrismaInputJsonValue(event.payload),
      idempotencyKey: event.idempotencyKey ?? null,
    };

    if (event.idempotencyKey) {
      // Catching P2002 cannot repair an aborted Postgres transaction. Use
      // ON CONFLICT so duplicate intent leaves the business transaction usable.
      const result = await tx.outboxEvent.createMany({
        data,
        skipDuplicates: true,
      });
      if (result.count === 0) {
        this.logger.debug(
          `[outbox] duplicate idempotencyKey ${event.idempotencyKey} for ${event.eventName} — already recorded`,
        );
      }
      return;
    }

    await tx.outboxEvent.create({ data });
  }
}
