import { Test, TestingModule } from '@nestjs/testing';
import { RequestLogService } from './request-log.service';
import { PrismaService } from '@/prisma/prisma.service';
import { MonitoringFactory } from '@/shared/modules/monitoring/monitoring/factories/monitoring.factory';
import {
  API_REQUEST_METRICS_REPOSITORY_TOKEN,
  type ApiRequestMetricsRepository,
} from '@/shared/modules/monitoring/monitoring/ports/api-request-metrics.repository.port';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';
import { TelemetryCaptureRecorder } from '@/shared/modules/monitoring/monitoring/services/telemetry-capture-recorder.service';
import { createTelemetryCaptureRecorderStub } from '@/test-utils/telemetry-capture-recorder.mock';
import type { TelemetryCaptureRecorderStub } from '@/test-utils/telemetry-capture-recorder.mock';

/** Mirrors the production ceiling so the truncation test does not hardcode it. */
const MAX_BUFFER_SIZE = 10_000;
import { ApiRequestInput } from '@/shared/modules/monitoring/monitoring/schemas/monitoring.schema';
import {
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
  jest,
} from '@jest/globals';

describe('RequestLogService', () => {
  let service: RequestLogService;
  let captureRecorder: TelemetryCaptureRecorderStub;
  let prismaService: {
    runUnrestricted: ReturnType<typeof jest.fn>;
    $queryRaw: ReturnType<typeof jest.fn>;
    apiRequest: {
      createMany: ReturnType<typeof jest.fn>;
      count: ReturnType<typeof jest.fn>;
      aggregate: ReturnType<typeof jest.fn>;
      groupBy: ReturnType<typeof jest.fn>;
      findMany: ReturnType<typeof jest.fn>;
      deleteMany: ReturnType<typeof jest.fn>;
    };
  };

  const mockPrismaService = {
    runUnrestricted: jest.fn(async <T>(callback: () => Promise<T>) =>
      callback(),
    ),
    $queryRaw: jest.fn(async () => []),
    apiRequest: {
      createMany: jest.fn(),
      count: jest.fn(async () => 100),
      aggregate: jest.fn(async () => ({ _avg: { duration: 50 } })),
      groupBy: jest.fn(async () => []),
      findMany: jest.fn(async () => []),
      findFirst: jest.fn(async () => ({ observedAt: new Date() })),
      deleteMany: jest.fn(async () => ({ count: 10 })),
    },
  };

  const mockMonitoringFactory = {
    createApiRequest: jest.fn((data) => data),
  };

  const apiRequestMetricsMock: jest.Mocked<
    Pick<
      ApiRequestMetricsRepository,
      | 'getResponseTimeDistribution'
      | 'getThroughputByMinute'
      | 'getRequestsByHour'
    >
  > = {
    getResponseTimeDistribution: jest
      .fn<ApiRequestMetricsRepository['getResponseTimeDistribution']>()
      .mockResolvedValue([]),
    getThroughputByMinute: jest
      .fn<ApiRequestMetricsRepository['getThroughputByMinute']>()
      .mockResolvedValue([]),
    getRequestsByHour: jest
      .fn<ApiRequestMetricsRepository['getRequestsByHour']>()
      .mockResolvedValue([]),
  };

  beforeEach(async () => {
    // Several tests swap createMany for a rejecting implementation; without a
    // fresh mock per test that failure leaks into the next one.
    mockPrismaService.apiRequest.createMany = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestLogService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MonitoringFactory, useValue: mockMonitoringFactory },
        {
          provide: API_REQUEST_METRICS_REPOSITORY_TOKEN,
          useValue: apiRequestMetricsMock,
        },
        {
          provide: CLOCK_PORT,
          useValue: { now: () => new Date('2026-05-19T12:00:00.000Z') },
        },
        {
          provide: TelemetryCaptureRecorder,
          useValue: createTelemetryCaptureRecorderStub(),
        },
      ],
    }).compile();

    service = module.get<RequestLogService>(RequestLogService);
    prismaService = module.get(PrismaService) as typeof prismaService;
    captureRecorder = module.get(TelemetryCaptureRecorder) as never;
  });

  afterEach(() => {
    jest.clearAllMocks();

    if (service['flushTimer']) {
      clearInterval(service['flushTimer']);
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logRequest', () => {
    it('should buffer requests', () => {
      const request: ApiRequestInput = {
        method: 'GET',
        path: '/test',
        duration: 100,
        statusCode: 200,
        requestSize: 0,
        responseSize: 0,
      };

      service.logRequest(request);
      expect(service['requestBuffer']).toHaveLength(1);
    });

    it('should flush when buffer size limit reached', () => {
      jest.spyOn(service, 'flushBuffer');
      const request: ApiRequestInput = {
        method: 'GET',
        path: '/test',
        duration: 100,
        statusCode: 200,
        requestSize: 0,
        responseSize: 0,
      };

      for (let i = 0; i < 100; i++) {
        service.logRequest(request);
      }

      expect(service.flushBuffer).toHaveBeenCalled();
    });
  });

  describe('flushBuffer', () => {
    it('should write to prisma', async () => {
      const request: ApiRequestInput = {
        method: 'GET',
        path: '/test',
        duration: 100,
        statusCode: 200,
        requestSize: 0,
        responseSize: 0,
      };
      service.logRequest(request);

      await service.flushBuffer();
      expect(prismaService.apiRequest.createMany).toHaveBeenCalled();
      expect(prismaService.runUnrestricted).toHaveBeenCalled();
      expect(service['requestBuffer']).toHaveLength(0);
    });

    it('should do nothing if buffer empty', async () => {
      await service.flushBuffer();
      expect(prismaService.apiRequest.createMany).not.toHaveBeenCalled();
    });

    it('should disable persistence on database authentication failure', async () => {
      const request: ApiRequestInput = {
        method: 'GET',
        path: '/test',
        duration: 100,
        statusCode: 200,
        requestSize: 0,
        responseSize: 0,
      };

      prismaService.apiRequest.createMany = jest
        .fn()
        .mockImplementationOnce(async () => {
          throw {
            code: 'P1000',
            message:
              'Authentication failed against the database server, the provided database credentials are not valid',
          };
        });

      service.logRequest(request);
      await service.flushBuffer();

      expect(service['persistenceDisabled']).toBe(true);
      expect(service['requestBuffer']).toHaveLength(0);

      prismaService.apiRequest.createMany = jest.fn();
      service.logRequest(request);
      await service.flushBuffer();

      expect(prismaService.apiRequest.createMany).not.toHaveBeenCalled();
    });

    /**
     * The defect O02 closes: disabling persistence discarded the buffer with no
     * record, so a dashboard read the last retained rows as current traffic.
     */
    it('records the discarded buffer as a capture gap when it disables persistence', async () => {
      const request: ApiRequestInput = {
        method: 'GET',
        path: '/api/v1/patients',
        duration: 100,
        statusCode: 200,
      };
      for (let i = 0; i < 3; i++) {
        service.logRequest(request);
      }
      prismaService.apiRequest.createMany = jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockRejectedValueOnce({
          code: 'P1000',
          message:
            'Authentication failed against the database server, the provided database credentials are not valid',
        });

      await service.flushBuffer();

      expect(captureRecorder.recordDisabled).toHaveBeenCalledWith(
        'DATABASE_AUTH_FAILURE',
        3,
        0,
      );
      expect(service.getDroppedRequestCount()).toBe(3);

      // Requests arriving while capture is off are counted, not silently lost.
      service.logRequest(request);
      service.logRequest(request);
      expect(service.getDroppedRequestCount()).toBe(5);
    });

    it('records only the first disable reason instead of repeating it', async () => {
      prismaService.apiRequest.createMany = jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockRejectedValue({
          code: 'P1000',
          message:
            'Authentication failed against the database server, the provided database credentials are not valid',
        });

      service.logRequest({
        method: 'GET',
        path: '/api/v1/patients',
        duration: 1,
        statusCode: 200,
      });
      await service.flushBuffer();
      await service.flushBuffer();

      expect(captureRecorder.recordDisabled).toHaveBeenCalledTimes(1);
    });

    it('flushes capture events that were retained while the database was down', async () => {
      service.logRequest({
        method: 'GET',
        path: '/api/v1/patients',
        duration: 5,
        statusCode: 200,
      });

      await service.flushBuffer();

      expect(captureRecorder.flushPending).toHaveBeenCalled();
    });

    it('retains the buffer on a transient write failure instead of dropping it', async () => {
      service.logRequest({
        method: 'GET',
        path: '/api/v1/patients',
        duration: 5,
        statusCode: 200,
      });
      prismaService.apiRequest.createMany = jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockRejectedValueOnce(new Error('deadlock detected'));

      await service.flushBuffer();

      expect(service['requestBuffer']).toHaveLength(1);
      expect(service['persistenceDisabled']).toBe(false);
      expect(captureRecorder.recordDisabled).not.toHaveBeenCalled();
    });

    it('classifies the route category, correlation id, observed instant and latency validity on write', async () => {
      service.logRequest({
        method: 'GET',
        path: '/api/health/ready',
        duration: 3,
        statusCode: 200,
        correlationId: 'corr-12345678',
        observedAt: new Date('2026-05-19T11:59:59.000Z'),
      });
      service.logRequest({
        method: 'GET',
        path: '/api/v1/patients',
        duration: 999_999,
        statusCode: 200,
      });

      await service.flushBuffer();

      const { data } = prismaService.apiRequest.createMany.mock
        .calls[0]?.[0] as {
        data: Array<Record<string, unknown>>;
      };
      expect(data[0]).toMatchObject({
        routeCategory: 'HEALTH_CHECK',
        correlationId: 'corr-12345678',
        observedAt: new Date('2026-05-19T11:59:59.000Z'),
        latencyValid: true,
      });
      expect(data[1]).toMatchObject({
        routeCategory: 'CUSTOMER',
        latencyValid: false,
      });
    });

    it('truncates the buffer at the ceiling and records the loss', async () => {
      const request: ApiRequestInput = {
        method: 'GET',
        path: '/api/v1/patients',
        duration: 1,
        statusCode: 200,
      };
      // Buffer is never flushed because the batch trigger fires a flush that the
      // in-progress guard makes a no-op for the rest of this test.
      prismaService.apiRequest.createMany = jest.fn(
        () => new Promise(() => {}),
      );

      for (let i = 0; i < MAX_BUFFER_SIZE + 25; i++) {
        service.logRequest(request);
      }

      expect(service['requestBuffer']).toHaveLength(MAX_BUFFER_SIZE);
      expect(captureRecorder.recordTruncated).toHaveBeenCalledWith(
        'BUFFER_OVERFLOW',
        expect.any(Number),
        MAX_BUFFER_SIZE,
      );
      expect(service.getDroppedRequestCount()).toBe(25);
    });
  });

  describe('getRequestStats', () => {
    it('should aggregate stats', async () => {
      apiRequestMetricsMock.getRequestsByHour.mockResolvedValueOnce([
        { hour: 10, count: 3n },
      ]);
      prismaService.apiRequest.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { routeCategory: 'CUSTOMER', _count: { id: 60 } },
          { routeCategory: 'HEALTH_CHECK', _count: { id: 40 } },
        ]);

      const stats = await service.getRequestStats();
      expect(stats.totalRequests).toBe(100);
      expect(prismaService.apiRequest.aggregate).toHaveBeenCalled();
      expect(apiRequestMetricsMock.getRequestsByHour).toHaveBeenCalled();
      expect(stats.requestsByHour).toEqual([{ hour: 10, count: 3 }]);
      expect(stats.byRouteCategory).toEqual({
        customer: 60,
        healthCheck: 40,
        internal: 0,
      });
    });

    it('averages latency over valid samples only and windows on observedAt', async () => {
      await service.getRequestStats(
        new Date('2026-04-04T13:00:00.000Z'),
        new Date('2026-04-04T14:00:00.000Z'),
      );

      const aggregateCall = prismaService.apiRequest.aggregate.mock
        .calls[0]?.[0] as { where: Record<string, unknown> };
      expect(aggregateCall.where.latencyValid).toBe(true);
      // Not createdAt: a row flushed late must still count in the window the
      // request completed in.
      expect(aggregateCall.where.observedAt).toEqual({
        gte: new Date('2026-04-04T13:00:00.000Z'),
        lte: new Date('2026-04-04T14:00:00.000Z'),
      });
      expect(aggregateCall.where.createdAt).toBeUndefined();
    });
  });

  describe('cleanupOldRequests', () => {
    it('should delete old requests', async () => {
      const result = await service.cleanupOldRequests(30);
      expect(prismaService.apiRequest.deleteMany).toHaveBeenCalled();
      expect(result).toBe(10);
    });
  });
});
