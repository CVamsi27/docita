import { Test, TestingModule } from '@nestjs/testing';
import { FinancialAnalyticsFactory } from './financial-analytics.factory';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('FinancialAnalyticsFactory', () => {
  let factory: FinancialAnalyticsFactory;
  let prisma: PrismaService;
  let _cacheManager: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  const mockInvoiceFindMany =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockProcedureGroupBy =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockReadClientValue = {
    invoice: { findMany: mockInvoiceFindMany },
    procedure: { groupBy: mockProcedureGroupBy },
  };
  const mockPrismaService = {
    getReadClient: jest.fn().mockReturnValue(mockReadClientValue),
  };

  const mockCacheManager = {
    get: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    set: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialAnalyticsFactory,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        {
          provide: AppConfigService,
          useValue: {
            getConfig: jest.fn().mockReturnValue({}),
            getAppUrl: jest.fn().mockReturnValue('http://localhost:3000'),
            getEnvironment: jest.fn().mockReturnValue('test'),
          },
        },
      ],
    }).compile();

    factory = module.get<FinancialAnalyticsFactory>(FinancialAnalyticsFactory);
    prisma = module.get<PrismaService>(PrismaService);
    _cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  describe('getRevenueTrends', () => {
    it('should return cached data if available', async () => {
      const mockCachedData = [{ date: '2023-01-01', revenue: 100 }];
      mockCacheManager.get.mockResolvedValue(mockCachedData);

      const result = await factory.getRevenueTrends('clinic-1');

      expect(result).toEqual(mockCachedData);
      expect(mockCacheManager.get).toHaveBeenCalled();
      expect(mockPrismaService.getReadClient).not.toHaveBeenCalled();
    });

    it('should query db if cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const mockInvoices = [
        { createdAt: new Date('2023-01-01'), total: 100 },
        { createdAt: new Date('2023-01-01'), total: 50 },
      ];

      mockInvoiceFindMany.mockResolvedValue(mockInvoices);

      const result = await factory.getRevenueTrends('clinic-1');

      expect(result).toHaveLength(1);
      expect(result[0].revenue).toBe(150);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });

    it('groups revenue by period for monthly aggregation', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockInvoiceFindMany.mockResolvedValue([
        { createdAt: new Date('2023-01-05'), total: 100 },
        { createdAt: new Date('2023-01-15'), total: 150 },
        { createdAt: new Date('2023-02-01'), total: 200 },
      ]);

      const result = await factory.getRevenueTrends('clinic-1', 'monthly', 60);

      expect(result).toEqual([
        { date: '2023-01', revenue: 250 },
        { date: '2023-02', revenue: 200 },
      ]);
    });
  });
});
