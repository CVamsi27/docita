import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { OperationalAnalyticsFactory } from './operational-analytics.factory';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

describe('OperationalAnalyticsFactory', () => {
  let factory: OperationalAnalyticsFactory;

  const mockAppointmentCount =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockAppointmentGroupBy =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockPatientCount = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockPatientFindMany =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockPatientGroupBy =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockQueryRaw = jest.fn<(...args: unknown[]) => Promise<unknown>>();

  const mockReadClientValue = {
    $queryRaw: mockQueryRaw,
    appointment: {
      count: mockAppointmentCount,
      groupBy: mockAppointmentGroupBy,
    },
    patient: {
      count: mockPatientCount,
      findMany: mockPatientFindMany,
      groupBy: mockPatientGroupBy,
    },
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
        OperationalAnalyticsFactory,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        {
          provide: AppConfigService,
          useValue: {
            getAnalyticsCacheTtl: jest.fn().mockReturnValue(3600),
          },
        },
      ],
    }).compile();

    factory = module.get<OperationalAnalyticsFactory>(
      OperationalAnalyticsFactory,
    );
    jest.clearAllMocks();
    mockPrismaService.getReadClient.mockReturnValue(mockReadClientValue);
  });

  it('aggregates appointment stats with DB groupBy instead of findMany', async () => {
    mockAppointmentCount.mockResolvedValue(15);
    mockAppointmentGroupBy
      .mockResolvedValueOnce([
        { status: 'COMPLETED', _count: { id: 10 } },
        { status: 'CANCELLED', _count: { id: 5 } },
      ])
      .mockResolvedValueOnce([
        { type: 'CONSULTATION', _count: { id: 12 } },
        { type: 'FOLLOW_UP', _count: { id: 3 } },
      ]);

    const result = await factory.getAppointmentStats('clinic-1');

    expect(result).toEqual({
      total: 15,
      byStatus: {
        COMPLETED: 10,
        CANCELLED: 5,
      },
      byType: {
        CONSULTATION: 12,
        FOLLOW_UP: 3,
      },
    });
    expect(mockAppointmentCount).toHaveBeenCalledTimes(1);
    expect(mockAppointmentGroupBy).toHaveBeenCalledTimes(2);
  });

  it('computes uncoded visits using count queries', async () => {
    mockAppointmentCount.mockResolvedValueOnce(22).mockResolvedValueOnce(7);

    const result = await factory.getUncodedVisitsStats('clinic-1');

    expect(result).toEqual({
      totalUncoded: 22,
      uncodedOlderThan7Days: 7,
      recentUncoded: 15,
    });
    expect(mockAppointmentCount).toHaveBeenCalledTimes(2);
  });

  it('computes demographics with grouped gender counts and age-band counts', async () => {
    mockCacheManager.get.mockResolvedValue(null);
    mockPatientCount
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockPatientGroupBy.mockResolvedValue([
      { gender: 'MALE', _count: { _all: 2 } },
      { gender: 'FEMALE', _count: { _all: 1 } },
    ]);

    const result = await factory.getPatientDemographics('clinic-1');

    expect(result.totalPatients).toBe(3);
    expect(result.genderDistribution).toEqual({
      MALE: 2,
      FEMALE: 1,
      OTHER: 0,
    });
    expect(result.ageDistribution).toEqual({
      '0-18': 1,
      '18-35': 1,
      '35-50': 1,
      '50-65': 0,
      '65+': 0,
    });
    expect(mockPatientCount).toHaveBeenCalledTimes(6);
    expect(mockPatientGroupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ['gender'],
      }),
    );
    expect(mockPatientFindMany).not.toHaveBeenCalled();
  });

  it('computes patient growth from grouped SQL rows', async () => {
    mockCacheManager.get.mockResolvedValue(null);
    mockQueryRaw.mockResolvedValue([
      { date: '2026-04-27', count: 2 },
      { date: '2026-04-28', count: 3 },
    ]);

    const result = await factory.getPatientGrowth('clinic-1', 7);

    expect(result).toEqual([
      { date: '2026-04-27', count: 2 },
      { date: '2026-04-28', count: 5 },
    ]);
    expect(mockQueryRaw).toHaveBeenCalled();
    expect(mockPatientFindMany).not.toHaveBeenCalled();
  });
});
