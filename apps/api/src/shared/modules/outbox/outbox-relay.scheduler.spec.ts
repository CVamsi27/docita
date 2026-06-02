import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { PrismaService } from '@/prisma/prisma.service';
import { asType } from '@/test-utils';
import { OutboxRelayScheduler } from './outbox-relay.scheduler';

describe('OutboxRelayScheduler', () => {
  const row = {
    id: 'outbox-1',
    event_name: 'payment.captured',
    payload: { invoiceId: 'invoice-1' },
    aggregate_id: 'invoice-1',
    clinic_id: 'clinic-1',
  };

  it('atomically claims a batch and finalizes successful dispatches', async () => {
    const queryRaw = jest.fn().mockResolvedValue([row]);
    const update = jest.fn().mockResolvedValue(undefined);
    const emit = jest.fn().mockReturnValue(true);
    const scheduler = new OutboxRelayScheduler(
      asType<PrismaService>({
        $queryRaw: queryRaw,
        outboxEvent: { update },
      }),
      asType<EventEmitter2>({ emit }),
    );

    await scheduler.drain();

    const sql = queryRaw.mock.calls[0]?.[0]?.join(' ') ?? '';
    expect(sql).toContain('FOR UPDATE SKIP LOCKED');
    expect(sql).toContain('UPDATE "OutboxEvent"');
    expect(emit).toHaveBeenCalledWith('payment.captured', {
      invoiceId: 'invoice-1',
      __outboxId: 'outbox-1',
      __aggregateId: 'invoice-1',
      __clinicId: 'clinic-1',
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'outbox-1' },
      data: {
        processedAt: expect.any(Date),
        nextAttemptAt: null,
        lastError: null,
      },
    });
  });

  it('records a bounded retry delay when synchronous dispatch fails', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const scheduler = new OutboxRelayScheduler(
      asType<PrismaService>({
        $queryRaw: jest.fn().mockResolvedValue([row]),
        outboxEvent: {
          findUnique: jest.fn().mockResolvedValue({ attempts: 2 }),
          update,
        },
      }),
      asType<EventEmitter2>({
        emit: jest.fn(() => {
          throw new Error('listener failed');
        }),
      }),
    );

    await scheduler.drain();

    expect(update).toHaveBeenCalledWith({
      where: { id: 'outbox-1' },
      data: {
        lastError: 'listener failed',
        nextAttemptAt: expect.any(Date),
      },
    });
  });
});
