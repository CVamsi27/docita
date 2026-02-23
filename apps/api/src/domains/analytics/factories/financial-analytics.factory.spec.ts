import { Test, TestingModule } from '@nestjs/testing';
import { FinancialAnalyticsFactory } from './financial-analytics.factory';
import { PrismaService } from '../../../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('FinancialAnalyticsFactory', () => {
  let factory: FinancialAnalyticsFactory;
  let prisma: PrismaService;
  let cacheManager: { get: jest.Mock; set: jest.Mock; del: jest.Mock };

  const mockPrismaService = {
    getReadClient: jest.fn().mockReturnValue({
      invoice: {
        findMany: jest.fn(),
      },
      procedure: {
        groupBy: jest.fn(),
      },
    }),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialAnalyticsFactory,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    factory = module.get<FinancialAnalyticsFactory>(FinancialAnalyticsFactory);
    prisma = module.get<PrismaService>(PrismaService);
    cacheManager = module.get(CACHE_MANAGER);
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
      expect(prisma.getReadClient).not.toHaveBeenCalled();
    });

    it('should query db if cache miss', async () => {
      mockCacheManager.get.mockResolvedValue(null);

      const mockInvoices = [
        { createdAt: new Date('2023-01-01'), total: 100 },
        { createdAt: new Date('2023-01-01'), total: 50 },
      ];

      const mockReadClient = mockPrismaService.getReadClient();
      mockReadClient.invoice.findMany.mockResolvedValue(mockInvoices);

      const result = await factory.getRevenueTrends('clinic-1');

      // 100 + 50 = 150
      expect(result).toHaveLength(1);
      expect(result[0].revenue).toBe(150);
      expect(mockCacheManager.set).toHaveBeenCalled();
    });
  });
});
