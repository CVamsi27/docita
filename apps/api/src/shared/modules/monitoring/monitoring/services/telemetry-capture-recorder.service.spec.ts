import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { RouteCategory, TelemetryCaptureState } from '@workspace/db';
import { TELEMETRY_COVERAGE_NOTE } from '@workspace/types';
import { PrismaService } from '@/prisma/prisma.service';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';
import {
  TelemetryCaptureRecorder,
  resolveCoverageState,
} from './telemetry-capture-recorder.service';

type ApiRequestRow = {
  routeCategory: RouteCategory;
  _count: { id: number };
};

type CaptureEventRow = {
  state: TelemetryCaptureState;
  reason: string;
  droppedRequests: number;
  bufferedRequests: number;
  recordedAt: Date;
};

describe('TelemetryCaptureRecorder', () => {
  const NOW = new Date('2026-10-03T12:00:00.000Z');

  let service: TelemetryCaptureRecorder;
  let prisma: {
    runUnrestricted: jest.Mock<
      (fn: () => Promise<unknown>) => Promise<unknown>
    >;
    telemetryCaptureEvent: {
      createMany: jest.Mock<(args: unknown) => Promise<unknown>>;
      findMany: jest.Mock<(args: unknown) => Promise<unknown[]>>;
    };
    apiRequest: {
      findFirst: jest.Mock<
        (args: unknown) => Promise<{ observedAt: Date } | null>
      >;
      count: jest.Mock<(args: unknown) => Promise<number>>;
      groupBy: jest.Mock<(args: unknown) => Promise<ApiRequestRow[]>>;
    };
  };

  const mockPrisma = {
    runUnrestricted: jest.fn((fn: () => Promise<unknown>) => fn()),
    telemetryCaptureEvent: {
      createMany: jest.fn(async () => ({ count: 1 })),
      findMany: jest.fn(async () => [] as CaptureEventRow[]),
    },
    apiRequest: {
      findFirst: jest.fn(
        async () =>
          ({ observedAt: NOW }) as {
            observedAt: Date;
          } | null,
      ),
      count: jest.fn(async () => 0),
      groupBy: jest.fn(async () => [] as ApiRequestRow[]),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.telemetryCaptureEvent.createMany.mockResolvedValue({
      count: 1,
    });
    mockPrisma.telemetryCaptureEvent.findMany.mockResolvedValue([]);
    mockPrisma.apiRequest.findFirst.mockResolvedValue({ observedAt: NOW });
    mockPrisma.apiRequest.count.mockResolvedValue(0);
    mockPrisma.apiRequest.groupBy.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryCaptureRecorder,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CLOCK_PORT, useValue: { now: () => NOW } },
      ],
    }).compile();

    service = module.get(TelemetryCaptureRecorder);
    prisma = mockPrisma;
  });

  describe('capture events', () => {
    it('persists a disabled event with the dropped count', async () => {
      await service.recordDisabled('DATABASE_AUTH_FAILURE', 37, 0);

      expect(prisma.telemetryCaptureEvent.createMany).toHaveBeenCalledTimes(1);
      const { data } = prisma.telemetryCaptureEvent.createMany.mock
        .calls[0]?.[0] as {
        data: Array<{
          state: string;
          reason: string;
          droppedRequests: number;
          recordedAt: Date;
        }>;
      };
      expect(data).toHaveLength(1);
      expect(data[0]).toMatchObject({
        state: TelemetryCaptureState.CAPTURE_DISABLED,
        reason: 'DATABASE_AUTH_FAILURE',
        droppedRequests: 37,
      });
      expect(data[0]?.recordedAt).toBe(NOW);
    });

    it('distinguishes a truncation from a full stop', async () => {
      await service.recordTruncated('BUFFER_OVERFLOW', 4, 10000);

      const { data } = prisma.telemetryCaptureEvent.createMany.mock
        .calls[0]?.[0] as {
        data: Array<{
          state: string;
          droppedRequests: number;
          bufferedRequests: number;
        }>;
      };
      expect(data[0]?.state).toBe(TelemetryCaptureState.CAPTURE_TRUNCATED);
      expect(data[0]?.droppedRequests).toBe(4);
      expect(data[0]?.bufferedRequests).toBe(10000);
    });

    it('records recovery with no dropped rows', async () => {
      await service.recordRecovered('DATABASE_RESTORED');

      const { data } = prisma.telemetryCaptureEvent.createMany.mock
        .calls[0]?.[0] as {
        data: Array<{ state: string; droppedRequests: number }>;
      };
      expect(data[0]?.state).toBe(TelemetryCaptureState.CAPTURE_RECOVERED);
      expect(data[0]?.droppedRequests).toBe(0);
    });

    /**
     * The defect this closes: a gap discovered while the database is unreachable
     * used to be unreportable, because the write that would record it needed
     * the same database.
     */
    it('retains the event in memory when the write fails and flushes it later', async () => {
      mockPrisma.telemetryCaptureEvent.createMany.mockRejectedValueOnce(
        new Error('connection refused'),
      );

      await service.recordDisabled('DATABASE_AUTH_FAILURE', 5, 0);
      expect(service.getPendingCount()).toBe(1);

      await service.flushPending();
      expect(service.getPendingCount()).toBe(0);
      expect(prisma.telemetryCaptureEvent.createMany).toHaveBeenCalledTimes(2);
      const { data } = prisma.telemetryCaptureEvent.createMany.mock
        .calls[1]?.[0] as {
        data: Array<{ reason: string; droppedRequests: number }>;
      };
      expect(data[0]?.reason).toBe('DATABASE_AUTH_FAILURE');
      expect(data[0]?.droppedRequests).toBe(5);
    });

    it('keeps deferred events when the retry also fails', async () => {
      mockPrisma.telemetryCaptureEvent.createMany.mockRejectedValue(
        new Error('connection refused'),
      );

      await service.recordDisabled('DATABASE_AUTH_FAILURE', 2, 0);
      await service.flushPending();

      expect(service.getPendingCount()).toBe(1);
    });

    it('does not issue a write when nothing is pending', async () => {
      await service.flushPending();
      expect(prisma.telemetryCaptureEvent.createMany).not.toHaveBeenCalled();
    });
  });

  describe('getCoverage', () => {
    const windowStart = new Date('2026-10-03T00:00:00.000Z');
    const windowEnd = new Date('2026-10-03T23:59:59.000Z');

    it('reports COMPLETE when nothing was dropped', async () => {
      mockPrisma.apiRequest.count
        .mockResolvedValueOnce(120) // retained in window
        .mockResolvedValueOnce(0); // invalid latency samples
      mockPrisma.apiRequest.groupBy.mockResolvedValueOnce([
        { routeCategory: RouteCategory.CUSTOMER, _count: { id: 100 } },
        { routeCategory: RouteCategory.HEALTH_CHECK, _count: { id: 20 } },
      ]);

      const coverage = await service.getCoverage(windowStart, windowEnd);

      expect(coverage.state).toBe('COMPLETE');
      expect(coverage.retainedRequests).toBe(120);
      expect(coverage.byRouteCategory).toEqual({
        customer: 100,
        healthCheck: 20,
        internal: 0,
      });
      expect(coverage.droppedRequests).toBe(0);
      expect(coverage.coverageNote).toBe(TELEMETRY_COVERAGE_NOTE);
      expect(coverage.lastObservedAt).toBe(NOW.toISOString());
    });

    it('reports GAPS_RECORDED when a drop is on record', async () => {
      mockPrisma.apiRequest.count
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(1);
      mockPrisma.telemetryCaptureEvent.findMany.mockResolvedValueOnce([
        {
          state: TelemetryCaptureState.CAPTURE_DISABLED,
          reason: 'DATABASE_AUTH_FAILURE',
          droppedRequests: 120,
          bufferedRequests: 0,
          recordedAt: new Date('2026-10-03T06:00:00.000Z'),
        },
        {
          state: TelemetryCaptureState.CAPTURE_RECOVERED,
          reason: 'DATABASE_RESTORED',
          droppedRequests: 0,
          bufferedRequests: 0,
          recordedAt: new Date('2026-10-03T06:05:00.000Z'),
        },
      ]);

      const coverage = await service.getCoverage(windowStart, windowEnd);

      expect(coverage.state).toBe('GAPS_RECORDED');
      expect(coverage.droppedRequests).toBe(120);
      expect(coverage.captureEvents).toHaveLength(2);
      expect(coverage.captureEvents[0]?.recordedAt).toBe(
        '2026-10-03T06:00:00.000Z',
      );
    });

    it('reports UNAVAILABLE when nothing was retained during the window', async () => {
      // Last retained row predates the window: capture was off for all of it.
      mockPrisma.apiRequest.findFirst
        .mockResolvedValueOnce({
          observedAt: new Date('2026-09-01T00:00:00.000Z'),
        })
        .mockResolvedValueOnce({
          observedAt: new Date('2026-09-01T00:00:00.000Z'),
        });
      mockPrisma.apiRequest.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const coverage = await service.getCoverage(windowStart, windowEnd);

      expect(coverage.state).toBe('UNAVAILABLE');
      expect(coverage.retainedRequests).toBe(0);
    });

    it('reports UNAVAILABLE when nothing was ever retained', async () => {
      mockPrisma.apiRequest.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);
      mockPrisma.apiRequest.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const coverage = await service.getCoverage(windowStart, windowEnd);

      expect(coverage.state).toBe('UNAVAILABLE');
      expect(coverage.firstObservedAt).toBeNull();
      expect(coverage.lastObservedAt).toBeNull();
    });
  });
});

describe('resolveCoverageState', () => {
  const windowStart = new Date('2026-10-03T00:00:00.000Z');

  it('is UNAVAILABLE with no retained rows at all', () => {
    expect(
      resolveCoverageState({
        lastObservedAt: null,
        windowStart,
        droppedRequests: 0,
        retainedRequests: 0,
      }),
    ).toBe('UNAVAILABLE');
  });

  it('is UNAVAILABLE when the newest retained row predates the window', () => {
    expect(
      resolveCoverageState({
        lastObservedAt: new Date('2026-10-02T23:59:59.000Z'),
        windowStart,
        droppedRequests: 0,
        retainedRequests: 0,
      }),
    ).toBe('UNAVAILABLE');
  });

  it('is GAPS_RECORDED when anything was dropped', () => {
    expect(
      resolveCoverageState({
        lastObservedAt: windowStart,
        windowStart,
        droppedRequests: 1,
        retainedRequests: 10,
      }),
    ).toBe('GAPS_RECORDED');
  });

  it('is COMPLETE when rows are retained inside the window and nothing dropped', () => {
    expect(
      resolveCoverageState({
        lastObservedAt: windowStart,
        windowStart,
        droppedRequests: 0,
        retainedRequests: 10,
      }),
    ).toBe('COMPLETE');
  });

  it('is COMPLETE when the newest retained row is after the window closed', () => {
    // Coverage that extends past the window is not a gap; a zero-count window
    // with future retained rows means the filter, not capture, emptied it.
    expect(
      resolveCoverageState({
        lastObservedAt: new Date('2026-10-04T00:00:00.000Z'),
        windowStart,
        droppedRequests: 0,
        retainedRequests: 0,
      }),
    ).toBe('COMPLETE');
  });
});
