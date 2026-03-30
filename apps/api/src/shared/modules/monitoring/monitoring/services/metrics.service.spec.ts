import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from './metrics.service';
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
  let prismaService: PrismaService;

  const mockPrismaService = {
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
  };

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    prismaService = module.get<PrismaService>(PrismaService);
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
      jest
        .spyOn(prismaService.systemMetric, 'create')
        .mockRejectedValueOnce(new Error('DB Error'));

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
  });
});
