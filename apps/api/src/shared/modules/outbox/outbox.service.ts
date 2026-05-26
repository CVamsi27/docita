/**
 * Stub implementation of `IOutboxService` that delegates to
 * EventEmitter2 today and will swap to the Outbox table once the
 * Prisma model is provisioned.
 *
 * See ADR docs/architecture/decisions/0010-transactional-outbox.md.
 */
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Logger } from 'nestjs-pino';
import type { Prisma } from '@workspace/db';
import type { IOutboxService, OutboxAppend } from './outbox.interface';

@Injectable()
export class StubOutboxService implements IOutboxService {
  constructor(
    private readonly events: EventEmitter2,
    private readonly logger: Logger,
  ) {}

  async append(
    _tx: Prisma.TransactionClient,
    event: OutboxAppend,
  ): Promise<void> {
    this.events.emit(event.eventName, {
      ...(event.payload as Record<string, unknown>),
      __outboxStub: true,
      __clinicId: event.clinicId,
      __aggregateId: event.aggregateId,
    });
    this.logger.debug(
      `[outbox] stub emit ${event.eventName} (clinicId=${event.clinicId ?? '-'})`,
    );
  }
}
