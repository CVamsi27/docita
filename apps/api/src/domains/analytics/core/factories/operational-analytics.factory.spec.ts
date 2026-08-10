import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { OperationalAnalyticsFactory } from './operational-analytics.factory';
import { PrismaService } from '@/prisma/prisma.service';
import { ANALYTICS_PERSISTENCE_PORT } from '@/domains/analytics/application/ports/analytics-persistence.port';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  ANALYTICS_REPOSITORY_TOKEN,
  IAnalyticsRepository,
} from '@/domains/analytics/core/repositories/analytics.repository.interface';
import { clockPortTestProvider } from '@/test-utils';

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

  const mockReadClientValue = {
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

  const mockAnalyticsRepository = {
    getOverviewAggregates:
      jest.fn<IAnalyticsRepository['getOverviewAggregates']>(),
    getPatientCreationTimestamps:
      jest.fn<IAnalyticsRepository['getPatientCreationTimestamps']>(),
    getAppointmentStatusBreakdown: jest.fn<
      IAnalyticsRepository['getAppointmentStatusBreakdown']
    >(async (clinicId, since) => {
      const where = {
        clinicId,
        startTime: { gte: since },
      };
      const total = (await mockAppointmentCount({ where })) as number;
      const statusRows = (await mockAppointmentGroupBy({
        by: ['status'],
        where,
        _count: { id: true },
      })) as Array<{ status: string; _count: { id: number } }>;
      const typeRows = (await mockAppointmentGroupBy({
        by: ['type'],
        where,
        _count: { id: true },
      })) as Array<{ type: string; _count: { id: number } }>;

      return {
        total,
        statusCounts: statusRows.map((row) => ({
          status: row.status,
          count: row._count.id,
        })),
        typeCounts: typeRows.map((row) => ({
          type: row.type,
          count: row._count.id,
        })),
      };
    }),
    getAppointmentMetricsAggregates:
      jest.fn<IAnalyticsRepository['getAppointmentMetricsAggregates']>(),
    getPatientDemographicsAggregates: jest.fn<
      IAnalyticsRepository['getPatientDemographicsAggregates']
    >(async (where, cutoffs) => {
      const [
        totalPatients,
        age0to18,
        age18to35,
        age35to50,
        age50to65,
        age65plus,
      ] = (await Promise.all([
        mockPatientCount({ where }),
        mockPatientCount({
          where: { ...where, dateOfBirth: { gte: cutoffs.age18 } },
        }),
        mockPatientCount({
          where: {
            ...where,
            dateOfBirth: { lt: cutoffs.age18, gte: cutoffs.age35 },
          },
        }),
        mockPatientCount({
          where: {
            ...where,
            dateOfBirth: { lt: cutoffs.age35, gte: cutoffs.age50 },
          },
        }),
        mockPatientCount({
          where: {
            ...where,
            dateOfBirth: { lt: cutoffs.age50, gte: cutoffs.age65 },
          },
        }),
        mockPatientCount({
          where: { ...where, dateOfBirth: { lt: cutoffs.age65 } },
        }),
      ])) as number[];
      const genders = (await mockPatientGroupBy({
        by: ['gender'],
        where,
        _count: { _all: true },
      })) as Array<{
        gender: 'MALE' | 'FEMALE' | 'OTHER' | null;
        _count: { _all: number };
      }>;

      return {
        totalPatients,
        genders: genders.map((row) => ({
          gender: row.gender,
          count: row._count._all,
        })),
        age0to18,
        age18to35,
        age35to50,
        age50to65,
        age65plus,
      };
    }),
    getUncodedVisitsAggregates: jest.fn<
      IAnalyticsRepository['getUncodedVisitsAggregates']
    >(async (clinicId, olderThanDate) => {
      const totalUncoded = (await mockAppointmentCount({
        where: { clinicId, medicalCoding: null },
      })) as number;
      const uncodedOlderThan7Days = (await mockAppointmentCount({
        where: {
          clinicId,
          medicalCoding: null,
          startTime: { lt: olderThanDate },
        },
      })) as number;
      return { totalUncoded, uncodedOlderThan7Days };
    }),
  } satisfies IAnalyticsRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperationalAnalyticsFactory,
        {
          provide: ANALYTICS_REPOSITORY_TOKEN,
          useValue: mockAnalyticsRepository,
        },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ANALYTICS_PERSISTENCE_PORT, useExisting: PrismaService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        {
          provide: AppConfigService,
          useValue: {
            getAnalyticsCacheTtl: jest.fn().mockReturnValue(3600),
          },
        },
        clockPortTestProvider(),
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
});
