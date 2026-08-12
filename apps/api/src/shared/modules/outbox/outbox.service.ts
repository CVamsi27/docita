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
import { isRecord } from '@workspace/utils';
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
    try {
      await tx.outboxEvent.create({
        data: {
          eventName: event.eventName,
          aggregateType: event.aggregateType ?? null,
          aggregateId: event.aggregateId ?? null,
          clinicId: event.clinicId,
          payload: toPrismaInputJsonValue(event.payload),
          idempotencyKey: event.idempotencyKey ?? null,
        },
      });
    } catch (error) {
      // P2002 on idempotencyKey means a previous emit for the same logical
      // event has already been recorded. Treat as a no-op so retries are safe.
      const code = isRecord(error) ? error.code : undefined;
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
