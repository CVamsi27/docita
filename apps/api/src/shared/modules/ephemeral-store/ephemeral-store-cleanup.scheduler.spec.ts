import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PrismaService } from '@/prisma/prisma.service';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { EphemeralStoreCleanupScheduler } from './ephemeral-store-cleanup.scheduler';

const BATCH = 5000;

describe('EphemeralStoreCleanupScheduler', () => {
  const idempotencyFindMany =
    jest.fn<(args?: unknown) => Promise<Array<{ id: string }>>>();
  const idempotencyDeleteMany =
    jest.fn<(args?: unknown) => Promise<{ count: number }>>();
  const webhookFindMany =
    jest.fn<(args?: unknown) => Promise<Array<{ id: string }>>>();
  const webhookDeleteMany =
    jest.fn<(args?: unknown) => Promise<{ count: number }>>();
  const onboardingFindMany =
    jest.fn<(args?: unknown) => Promise<Array<{ id: string }>>>();
  const onboardingDeleteMany =
    jest.fn<(args?: unknown) => Promise<{ count: number }>>();

  const prisma = Object.create(PrismaService.prototype) as PrismaService;
  Object.defineProperties(prisma, {
    apiHttpIdempotencyRecord: {
      value: {
        findMany: idempotencyFindMany,
        deleteMany: idempotencyDeleteMany,
      },
      writable: true,
    },
    webhookReplayDedupe: {
      value: { findMany: webhookFindMany, deleteMany: webhookDeleteMany },
      writable: true,
    },
    onboardingSession: {
      value: {
        findMany: onboardingFindMany,
        deleteMany: onboardingDeleteMany,
      },
      writable: true,
    },
  });

  const clock = { now: () => new Date('2026-06-12T00:00:00.000Z') };

  const scheduler = new EphemeralStoreCleanupScheduler(prisma, clock);

  beforeEach(() => {
    jest.clearAllMocks();
    idempotencyFindMany.mockResolvedValue([]);
    webhookFindMany.mockResolvedValue([]);
    onboardingFindMany.mockResolvedValue([]);
    idempotencyDeleteMany.mockResolvedValue({ count: 1 });
    webhookDeleteMany.mockResolvedValue({ count: 1 });
    onboardingDeleteMany.mockResolvedValue({ count: 1 });
  });

  it('is wired to the hourly ephemeral-store cleanup cron expression', () => {
    expect(CRON_SCHEDULES.EPHEMERAL_STORE_CLEANUP).toBe('0 * * * *');
  });

  it('purges expired rows from all three stores in batches', async () => {
    idempotencyFindMany
      .mockResolvedValueOnce([{ id: 'idem-1' }, { id: 'idem-2' }])
      .mockResolvedValueOnce([]);
    webhookFindMany
      .mockResolvedValueOnce([{ id: 'wh-1' }])
      .mockResolvedValueOnce([]);
    onboardingFindMany
      .mockResolvedValueOnce([{ id: 'ob-1' }])
      .mockResolvedValueOnce([]);

    await scheduler.purgeExpiredRows();

    expect(idempotencyDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['idem-1', 'idem-2'] } },
    });
    expect(webhookDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['wh-1'] } },
    });
    expect(onboardingDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['ob-1'] } },
    });
  });

  it('is a no-op when no store has stale rows', async () => {
    await scheduler.purgeExpiredRows();

    expect(idempotencyDeleteMany).not.toHaveBeenCalled();
    expect(webhookDeleteMany).not.toHaveBeenCalled();
    expect(onboardingDeleteMany).not.toHaveBeenCalled();
  });

  it('caps the purge loop at 20 rounds per store even with a full batch', async () => {
    idempotencyFindMany.mockResolvedValue(
      Array.from({ length: BATCH }, (_, i) => ({ id: `idem-${i}` })),
    );

    await scheduler.purgeExpiredRows();

    // the loop is hard-capped at 20 iterations — no trailing empty check
    expect(idempotencyFindMany).toHaveBeenCalledTimes(20);
    expect(idempotencyDeleteMany).toHaveBeenCalledTimes(20);
  });

  it('keeps purging while each round returns a full batch and stops on a short round', async () => {
    idempotencyFindMany
      .mockResolvedValueOnce(
        Array.from({ length: BATCH }, (_, i) => ({ id: `idem-${i}` })),
      )
      .mockResolvedValueOnce([{ id: 'idem-last' }])
      .mockResolvedValueOnce([]);

    await scheduler.purgeExpiredRows();

    expect(idempotencyDeleteMany).toHaveBeenCalledTimes(2);
  });
});
