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

  const buildScheduler = (
    emitter: Partial<EventEmitter2>,
    overrides: {
      update?: jest.Mock;
      findUnique?: jest.Mock;
      queryRaw?: jest.Mock;
    } = {},
  ) => {
    const update = overrides.update ?? jest.fn().mockResolvedValue(undefined);
    const findUnique =
      overrides.findUnique ?? jest.fn().mockResolvedValue({ attempts: 2 });
    const txQueryRaw = jest
      .fn()
      .mockResolvedValue([{ pg_try_advisory_xact_lock: true }]);
    const txFn = jest
      .fn()
      .mockImplementation(
        (cb: (tx: Record<string, unknown>) => Promise<unknown>) =>
          cb({ $queryRaw: txQueryRaw }),
      );

    const scheduler = new OutboxRelayScheduler(
      asType<PrismaService>({
        $queryRaw: overrides.queryRaw ?? jest.fn().mockResolvedValue([row]),
        $transaction: txFn,
        outboxEvent: { update, findUnique },
      }),
      asType<EventEmitter2>({
        // `emit` is present so a regression back to synchronous emission
        // behaves like the code it replaced instead of throwing.
        emit: jest.fn().mockReturnValue(true),
        emitAsync: jest.fn().mockResolvedValue([undefined]),
        ...emitter,
      }),
    );

    return { scheduler, update, findUnique };
  };

  it('atomically claims a batch and finalizes successful dispatches', async () => {
    const queryRaw = jest.fn().mockResolvedValue([row]);
    const emitAsync = jest.fn().mockResolvedValue([undefined]);
    const { scheduler, update } = buildScheduler({ emitAsync }, { queryRaw });

    await scheduler.drain();

    const sql = queryRaw.mock.calls[0]?.[0]?.join(' ') ?? '';
    expect(sql).toContain('FOR UPDATE SKIP LOCKED');
    expect(sql).toContain('UPDATE "OutboxEvent"');
    expect(emitAsync).toHaveBeenCalledWith('payment.captured', {
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
    const { scheduler } = buildScheduler(
      {
        emitAsync: jest.fn().mockRejectedValue(new Error('listener failed')),
      },
      { update, findUnique: jest.fn().mockResolvedValue({ attempts: 2 }) },
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

  describe('acknowledgment requires listener completion', () => {
    it('does not mark a row processed while an async listener is still running', async () => {
      // This is the defect the relay used to have: `emit` returned
      // immediately, so the row was acknowledged while the listener was still
      // working. The acknowledgment must not happen before the listener settles.
      let releaseListener: (() => void) | undefined;
      const listenerDone = new Promise<void>((resolve) => {
        releaseListener = resolve;
      });
      const emitAsync = jest
        .fn()
        .mockReturnValueOnce(listenerDone)
        .mockResolvedValueOnce([undefined]);

      const { scheduler, update } = buildScheduler({ emitAsync });

      const drained = scheduler.drain();
      await Promise.resolve();
      await new Promise((resolve) => setImmediate(resolve));

      expect(update).not.toHaveBeenCalled();

      releaseListener?.();
      await drained;

      expect(update).toHaveBeenCalledWith({
        where: { id: 'outbox-1' },
        data: {
          processedAt: expect.any(Date),
          nextAttemptAt: null,
          lastError: null,
        },
      });
    });

    it('leaves the row retryable when a late async listener rejects', async () => {
      // The listener's rejection arrives after dispatch started. The row must
      // stay unprocessed with the error recorded, never marked delivered.
      let rejectListener: ((error: Error) => void) | undefined;
      const listenerFailed = new Promise<unknown>((_, reject) => {
        rejectListener = reject;
      });
      const emitAsync = jest.fn().mockReturnValueOnce(listenerFailed);

      const update = jest.fn().mockResolvedValue(undefined);
      const { scheduler } = buildScheduler(
        { emitAsync },
        { update, findUnique: jest.fn().mockResolvedValue({ attempts: 1 }) },
      );

      const drained = scheduler.drain();
      await Promise.resolve();
      rejectListener?.(new Error('async listener rejected'));
      await drained;

      // Never acknowledged as delivered.
      expect(update).not.toHaveBeenCalledWith({
        where: { id: 'outbox-1' },
        data: { processedAt: expect.any(Date) },
      });
      // Retry intent persisted with the failure.
      expect(update).toHaveBeenCalledWith({
        where: { id: 'outbox-1' },
        data: {
          lastError: 'async listener rejected',
          nextAttemptAt: expect.any(Date),
        },
      });
    });

    it('treats a listener that never settles as a failure rather than a success', async () => {
      // A hung listener must not stall the outbox forever or be reported as
      // delivered; the row stays retryable.
      jest.useFakeTimers();
      try {
        const emitAsync = jest
          .fn()
          .mockReturnValue(new Promise(() => undefined));
        const update = jest.fn().mockResolvedValue(undefined);
        const { scheduler } = buildScheduler(
          { emitAsync },
          { update, findUnique: jest.fn().mockResolvedValue({ attempts: 1 }) },
        );

        const drained = scheduler.drain();
        await jest.advanceTimersByTimeAsync(30_000);
        await drained;

        expect(update).not.toHaveBeenCalledWith({
          where: { id: 'outbox-1' },
          data: { processedAt: expect.any(Date) },
        });
        expect(update).toHaveBeenCalledWith({
          where: { id: 'outbox-1' },
          data: {
            lastError: expect.stringContaining('exceeded'),
            nextAttemptAt: expect.any(Date),
          },
        });
      } finally {
        jest.useRealTimers();
      }
    });

    it('acknowledges every row when all listeners resolve', async () => {
      const rows = [
        { ...row, id: 'outbox-a', event_name: 'invoice.generated' },
        { ...row, id: 'outbox-b', event_name: 'appointment.created' },
      ];
      const emitAsync = jest.fn().mockResolvedValue([undefined]);
      const update = jest.fn().mockResolvedValue(undefined);
      const { scheduler } = buildScheduler(
        { emitAsync },
        {
          update,
          queryRaw: jest.fn().mockResolvedValue(rows),
        },
      );

      await scheduler.drain();

      expect(emitAsync).toHaveBeenCalledTimes(2);
      for (const id of ['outbox-a', 'outbox-b']) {
        expect(update).toHaveBeenCalledWith({
          where: { id },
          data: {
            processedAt: expect.any(Date),
            nextAttemptAt: null,
            lastError: null,
          },
        });
      }
    });

    it('keeps one failing row from blocking the rest of the batch', async () => {
      // Rows are dispatched concurrently, so key the behavior off the event
      // name rather than call order.
      const rows = [
        { ...row, id: 'outbox-ok', event_name: 'invoice.generated' },
        { ...row, id: 'outbox-bad', event_name: 'appointment.created' },
      ];
      const emitAsync = jest.fn(async (eventName: string) => {
        if (eventName === 'appointment.created') {
          throw new Error('listener failed');
        }
        return [undefined];
      });

      const update = jest.fn().mockResolvedValue(undefined);
      const { scheduler } = buildScheduler(
        { emitAsync },
        {
          update,
          queryRaw: jest.fn().mockResolvedValue(rows),
          findUnique: jest.fn().mockResolvedValue({ attempts: 1 }),
        },
      );

      await scheduler.drain();

      expect(update).toHaveBeenCalledWith({
        where: { id: 'outbox-ok' },
        data: {
          processedAt: expect.any(Date),
          lastError: null,
          nextAttemptAt: null,
        },
      });
      expect(update).toHaveBeenCalledWith({
        where: { id: 'outbox-bad' },
        data: { lastError: 'listener failed', nextAttemptAt: expect.any(Date) },
      });
    });
  });
});
