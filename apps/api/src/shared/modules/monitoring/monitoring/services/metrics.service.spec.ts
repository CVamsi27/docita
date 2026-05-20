import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
import { MetricsPersistenceService } from './metrics-persistence.service';
import { MetricsRecordingService } from './metrics-recording.service';
import { WebVitalsMetricsService } from './web-vitals-metrics.service';
import { MetricsQueryService } from './metrics-query.service';
import { API_REQUEST_METRICS_REPOSITORY_TOKEN } from '@/shared/modules/monitoring/monitoring/ports/api-request-metrics.repository.port';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';
import { MetricsAggregationService } from './metrics-aggregation.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Logger } from '@nestjs/common';
import { MetricType } from '@workspace/db';
import {
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
  jest,
} from '@jest/globals';

describe('MetricsService', () => {
  let service: MetricsService;
  let prismaService: {
    $queryRaw: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    systemMetric: {
      create: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
      createMany: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
      findMany: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
      deleteMany: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    };
    apiRequest: {
      groupBy: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
      findMany: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
      count: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    };
    performanceAggregate: {
      upsert: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
      findMany: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    };
    queueJob: {
      groupBy: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
      count: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    };
  };

  const apiRequestMetricsMock = {
    getResponseTimeDistribution: jest.fn().mockResolvedValue([]),
    getThroughputByMinute: jest.fn().mockResolvedValue([]),
    getRequestsByHour: jest.fn().mockResolvedValue([]),
  };

  const mockPrismaService = {
    $queryRaw: jest.fn(),
    systemMetric: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({ count: 5 }),
    },
    apiRequest: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    performanceAggregate: {
      upsert: jest.fn(),
      findMany: jest.fn(),
    },
    queueJob: {
      groupBy: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsPersistenceService,
        MetricsRecordingService,
        WebVitalsMetricsService,
        MetricsQueryService,
        MetricsAggregationService,
        MetricsService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: API_REQUEST_METRICS_REPOSITORY_TOKEN,
          useValue: apiRequestMetricsMock,
        },
        {
          provide: CLOCK_PORT,
          useValue: { now: () => new Date('2026-05-19T12:00:00.000Z') },
        },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordMetric', () => {
    it('should create a system metric', async () => {
      await service.recordMetric(MetricType.CPU_USAGE, 50, '%');
      expect(prismaService.systemMetric.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metricType: MetricType.CPU_USAGE,
            value: 50,
            unit: '%',
          }),
        }),
      );
    });

    it('should handle errors gracefully', async () => {
      prismaService.systemMetric.create.mockRejectedValueOnce(
        new Error('DB Error'),
      );

      await expect(
        service.recordMetric(MetricType.CPU_USAGE, 50),
      ).resolves.not.toThrow();
    });
  });

  describe('recordSystemMetrics', () => {
    it('should create multiple system metrics', async () => {
      await service.recordSystemMetrics();
      expect(prismaService.systemMetric.createMany).toHaveBeenCalled();
    });
  });

  describe('recordFeatureUsage', () => {
    it('should record feature usage metric', async () => {
      await service.recordFeatureUsage('test-feature', 'clinic-1', 'user-1');
      expect(prismaService.systemMetric.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metricType: MetricType.REQUEST_COUNT,
            value: 1,
            unit: 'count',
            metadata: expect.objectContaining({
              featureName: 'test-feature',
              clinicId: 'clinic-1',
              userId: 'user-1',
            }),
          }),
        }),
      );
    });
  });

  describe('getSystemMetrics', () => {
    it('should retrieve metrics', async () => {
      const now = new Date();
      await service.getSystemMetrics(now, now);
      expect(prismaService.systemMetric.findMany).toHaveBeenCalled();
    });
  });

  describe('cleanupOldMetrics', () => {
    it('should delete old metrics', async () => {
      const result = await service.cleanupOldMetrics(30);
      expect(prismaService.systemMetric.deleteMany).toHaveBeenCalled();
      expect(result).toBe(5);
    });
  });

  describe('getPerformanceMetrics', () => {
    it('should build distribution and throughput from db-side grouped queries', async () => {
      prismaService.apiRequest.groupBy.mockResolvedValueOnce([
        {
          path: '/api/v1/health',
          method: 'GET',
          _avg: { duration: 120 },
          _max: { duration: 220 },
          _count: { id: 5 },
        },
      ]);
      apiRequestMetricsMock.getResponseTimeDistribution.mockResolvedValueOnce([
        {
          range_0_100: 2n,
          range_100_250: 3n,
          range_250_500: 0n,
          range_500_1000: 0n,
          range_1000_2000: 0n,
          range_2000_5000: 0n,
          range_5000_plus: 0n,
        },
      ]);
      apiRequestMetricsMock.getThroughputByMinute.mockResolvedValueOnce([
        { minute: '2026-04-04T13:10', count: 4n },
      ]);

      const metrics = await service.getPerformanceMetrics(
        new Date('2026-04-04T13:00:00.000Z'),
        new Date('2026-04-04T14:00:00.000Z'),
      );

      expect(metrics.slowestEndpoints).toEqual([
        {
          path: '/api/v1/health',
          method: 'GET',
          avgDuration: 120,
          maxDuration: 220,
          count: 5,
        },
      ]);
      expect(metrics.responseTimeDistribution[0]).toEqual({
        range: '0-100ms',
        count: 2,
      });
      expect(metrics.responseTimeDistribution[1]).toEqual({
        range: '100-250ms',
        count: 3,
      });
      expect(metrics.throughputByMinute).toEqual([
        { minute: '2026-04-04T13:10', count: 4 },
      ]);
    });
  });

  describe('aggregateHourlyMetrics', () => {
    it('should avoid per-route count n+1 by using grouped success aggregates', async () => {
      prismaService.apiRequest.groupBy
        .mockResolvedValueOnce([
          {
            path: '/api/v1/health',
            method: 'GET',
            _count: { id: 10 },
            _avg: { duration: 100 },
            _min: { duration: 50 },
            _max: { duration: 300 },
          },
        ])
        .mockResolvedValueOnce([
          {
            path: '/api/v1/health',
            method: 'GET',
            _count: { id: 8 },
          },
        ]);

      await service.aggregateHourlyMetrics();

      expect(prismaService.apiRequest.groupBy).toHaveBeenCalledTimes(2);
      expect(prismaService.apiRequest.count).not.toHaveBeenCalled();
      expect(prismaService.performanceAggregate.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            totalRequests: 10,
            successCount: 8,
            errorCount: 2,
          }),
          update: expect.objectContaining({
            totalRequests: 10,
            successCount: 8,
            errorCount: 2,
          }),
        }),
      );
    });
  });

  describe('recordWebVital', () => {
    it('should record web vital and return rating', async () => {
      const vital = {
        name: 'LCP',
        value: 1000,
        id: '1',
        delta: 1,
        navigationType: 'navigate',
        rating: 'good' as const,
      };
      const result = await service.recordWebVital(vital);
      expect(result.rating).toBe('good');
      expect(prismaService.systemMetric.create).toHaveBeenCalled();
    });

    it('should return poor rating for bad metrics', async () => {
      const vital = {
        name: 'LCP',
        value: 5000,
        id: '1',
        delta: 1,
        navigationType: 'navigate',
        rating: 'poor' as const,
      };
      const result = await service.recordWebVital(vital);
      expect(result.rating).toBe('poor');
    });

    it('should persist optional feature in metadata', async () => {
      const vital = {
        name: 'LCP',
        value: 1200,
        rating: 'good' as const,
        feature: 'internal-admin',
      };
      await service.recordWebVital(vital);
      expect(prismaService.systemMetric.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              feature: 'internal-admin',
            }),
          }),
        }),
      );
    });
  });

  describe('getSecurityMonitoringSummary', () => {
    it('should aggregate status counts and top auth routes', async () => {
      prismaService.apiRequest.count
        .mockResolvedValueOnce(1000)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(5);
      prismaService.apiRequest.groupBy.mockResolvedValueOnce([
        {
          path: '/api/v1/patients',
          method: 'GET',
          statusCode: 401,
          _count: { id: 7 },
        },
      ]);

      const start = new Date('2026-01-01T00:00:00.000Z');
      const end = new Date('2026-01-02T00:00:00.000Z');
      const result = await service.getSecurityMonitoringSummary(start, end);

      expect(result.totalRequests).toBe(1000);
      expect(result.status401).toBe(10);
      expect(result.status403).toBe(3);
      expect(result.status429).toBe(2);
      expect(result.status5xx).toBe(5);
      expect(result.topAuthFailureRoutes).toHaveLength(1);
      expect(result.topAuthFailureRoutes[0]).toEqual({
        path: '/api/v1/patients',
        method: 'GET',
        statusCode: 401,
        count: 7,
      });
    });
  });

  describe('getQueueHealthSummary', () => {
    it('should return queue aggregates', async () => {
      prismaService.queueJob.groupBy
        .mockResolvedValueOnce([
          { status: 'WAITING', _count: { id: 4 } },
          { status: 'COMPLETED', _count: { id: 100 } },
        ])
        .mockResolvedValueOnce([{ name: 'email', _count: { id: 3 } }])
        .mockResolvedValueOnce([{ name: 'import', _count: { id: 1 } }]);
      prismaService.queueJob.count.mockResolvedValueOnce(2);

      const result = await service.getQueueHealthSummary();

      expect(result.countsByStatus).toHaveLength(2);
      expect(result.topQueuesByWaiting).toEqual([{ name: 'email', count: 3 }]);
      expect(result.topQueuesByFailed).toEqual([{ name: 'import', count: 1 }]);
      expect(result.deadLetteredLast24h).toBe(2);
    });
  });
});
