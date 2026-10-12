import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { backgroundJobsHealthSummarySchema } from '@workspace/types';
import { BackgroundJobsHealthService } from './background-jobs-health.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';

const NOW = new Date('2026-10-05T12:00:00.000Z');

function heartbeat(overrides: Record<string, unknown> = {}) {
  return {
    name: 'billing-monthly-overages',
    lastRunAt: new Date('2026-10-05T11:58:00.000Z'),
    lastStatus: 'SUCCESS' as const,
    lastError: null,
    ...overrides,
  };
}

describe('BackgroundJobsHealthService.getBackgroundJobsHealthSummary', () => {
  let service: BackgroundJobsHealthService;
  let prisma: {
    cronHeartbeat: {
      findMany: jest.Mock<(args: unknown) => Promise<unknown[]>>;
    };
    outboxEvent: {
      count: jest.Mock<(args: unknown) => Promise<number>>;
      findFirst: jest.Mock<(args: unknown) => Promise<unknown>>;
    };
  };

  const setOutbox = (
    options: {
      pending?: number;
      failing?: number;
      oldestPending?: Date | null;
      oldestRetry?: Date | null;
    } = {},
  ) => {
    prisma.outboxEvent.count
      // First call counts all pending, second counts pending-with-error.
      .mockResolvedValueOnce(options.pending ?? 0)
      .mockResolvedValueOnce(options.failing ?? 0);
    prisma.outboxEvent.findFirst
      .mockResolvedValueOnce(
        options.oldestPending ? { createdAt: options.oldestPending } : null,
      )
      .mockResolvedValueOnce(
        options.oldestRetry ? { createdAt: options.oldestRetry } : null,
      );
  };

  beforeEach(async () => {
    prisma = {
      cronHeartbeat: {
        findMany: jest.fn<(args: unknown) => Promise<unknown[]>>(
          async () => [],
        ),
      },
      outboxEvent: {
        count: jest.fn<(args: unknown) => Promise<number>>(),
        findFirst: jest.fn<(args: unknown) => Promise<unknown>>(),
      },
    };
    setOutbox();

    const clock: IClock = { now: () => NOW };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackgroundJobsHealthService,
        { provide: PrismaService, useValue: prisma },
        { provide: CLOCK_PORT, useValue: clock },
      ],
    }).compile();

    service = module.get(BackgroundJobsHealthService);
  });

  it('maps each cron heartbeat with its age and status', async () => {
    prisma.cronHeartbeat.findMany.mockResolvedValue([
      heartbeat(),
      heartbeat({
        name: 'outbox-relay',
        lastRunAt: new Date('2026-10-05T11:00:00.000Z'),
        lastStatus: 'FAILURE',
        lastError: 'relay dispatch timed out',
      }),
    ]);

    const summary = await service.getBackgroundJobsHealthSummary();

    expect(summary.schedulers).toEqual([
      {
        name: 'billing-monthly-overages',
        lastRunAt: '2026-10-05T11:58:00.000Z',
        lastStatus: 'SUCCESS',
        ageMs: 120_000,
        lastError: null,
      },
      {
        name: 'outbox-relay',
        lastRunAt: '2026-10-05T11:00:00.000Z',
        lastStatus: 'FAILURE',
        ageMs: 3_600_000,
        lastError: 'relay dispatch timed out',
      },
    ]);
    expect(summary.schedulerSummary).toEqual({
      total: 2,
      failing: 1,
      oldestAgeMs: 3_600_000,
    });
  });

  it('reports outbox pending, failing and oldest ages', async () => {
    prisma.outboxEvent.count
      .mockReset()
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(2);
    prisma.outboxEvent.findFirst
      .mockReset()
      .mockResolvedValueOnce({
        createdAt: new Date('2026-10-05T09:00:00.000Z'),
      })
      .mockResolvedValueOnce({
        createdAt: new Date('2026-10-05T10:00:00.000Z'),
      });

    const summary = await service.getBackgroundJobsHealthSummary();

    expect(summary.outbox).toEqual({
      pending: 7,
      failing: 2,
      oldestPendingAgeMs: 10_800_000,
      oldestRetryAgeMs: 7_200_000,
    });
  });

  it('reports null ages rather than zero when a backend is empty', async () => {
    const summary = await service.getBackgroundJobsHealthSummary();

    // A zero here would read as "brand new" rather than "nothing pending".
    expect(summary.outbox.oldestPendingAgeMs).toBeNull();
    expect(summary.outbox.oldestRetryAgeMs).toBeNull();
    expect(summary.schedulerSummary).toEqual({
      total: 0,
      failing: 0,
      oldestAgeMs: null,
    });
  });

  it('never reports a negative age if a row is stamped in the future', async () => {
    prisma.cronHeartbeat.findMany.mockResolvedValue([
      heartbeat({ lastRunAt: new Date('2026-10-05T12:30:00.000Z') }),
    ]);

    const summary = await service.getBackgroundJobsHealthSummary();

    expect(summary.schedulers[0].ageMs).toBe(0);
  });

  it('degrades to an explicit unknown rather than reporting zeros', async () => {
    prisma.cronHeartbeat.findMany.mockRejectedValue(new Error('table missing'));

    const summary = await service.getBackgroundJobsHealthSummary();

    expect(summary.schedulers).toEqual([]);
    expect(summary.outbox).toEqual({
      pending: 0,
      failing: 0,
      oldestPendingAgeMs: null,
      oldestRetryAgeMs: null,
    });
    expect(summary.coverageNote).toContain('unknown, not as zero');
  });

  it('satisfies the published response contract', async () => {
    prisma.cronHeartbeat.findMany.mockResolvedValue([
      heartbeat(),
      heartbeat({ lastStatus: 'FAILURE', lastError: 'boom' }),
    ]);

    const summary = await service.getBackgroundJobsHealthSummary();

    expect(() =>
      backgroundJobsHealthSummarySchema.parse(summary),
    ).not.toThrow();
  });
});
