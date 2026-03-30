import { Test, TestingModule } from '@nestjs/testing';
import { RequestLogService } from './request-log.service';
import { PrismaService } from '@/prisma/prisma.service';
import { MonitoringFactory } from '@/shared/modules/monitoring/monitoring/factories/monitoring.factory';
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
  let prismaService: PrismaService;

  const mockPrismaService = {
    apiRequest: {
      createMany: jest.fn(),
      count: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue(100),
      aggregate: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({ _avg: { duration: 50 } }),
      groupBy: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue([]),
      findMany: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue([]),
      deleteMany: jest
        .fn<(...args: unknown[]) => Promise<unknown>>()
        .mockResolvedValue({ count: 10 }),
    },
  };

  const mockMonitoringFactory = {
    createApiRequest: jest.fn((data) => data),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestLogService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MonitoringFactory, useValue: mockMonitoringFactory },
      ],
    }).compile();

    service = module.get<RequestLogService>(RequestLogService);
    prismaService = module.get<PrismaService>(PrismaService);
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

      prismaService.apiRequest.createMany = jest.fn().mockRejectedValueOnce({
        code: 'P1000',
        message:
          'Authentication failed against the database server, the provided database credentials are not valid',
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
  });

  describe('getRequestStats', () => {
    it('should aggregate stats', async () => {
      const stats = await service.getRequestStats();
      expect(stats.totalRequests).toBe(100);
      expect(prismaService.apiRequest.count).toHaveBeenCalledTimes(3);
      expect(prismaService.apiRequest.aggregate).toHaveBeenCalled();
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
