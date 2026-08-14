import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ClinicalAnalyticsFactory } from './clinical-analytics.factory';
import { PrismaService } from '@/prisma/prisma.service';
import { ANALYTICS_PERSISTENCE_PORT } from '@/domains/analytics/application/ports/analytics-persistence.port';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

describe('ClinicalAnalyticsFactory', () => {
  let factory: ClinicalAnalyticsFactory;

  const mockAppointmentCount =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockAppointmentFindMany =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockDiagnosisCount =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockDiagnosisGroupBy =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockProcedureCount =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockDirectAppointmentFindMany =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockQueryRaw = jest.fn<(...args: unknown[]) => Promise<unknown>>();

  const mockReadClientValue = {
    $queryRaw: mockQueryRaw,
    appointment: {
      count: mockAppointmentCount,
      findMany: mockAppointmentFindMany,
    },
    diagnosis: {
      count: mockDiagnosisCount,
      groupBy: mockDiagnosisGroupBy,
    },
    procedure: {
      count: mockProcedureCount,
    },
  };

  const mockPrismaService = {
    getReadClient: jest.fn().mockReturnValue(mockReadClientValue),
    appointment: {
      findMany: mockDirectAppointmentFindMany,
    },
  };

  const mockCacheManager = {
    get: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    set: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicalAnalyticsFactory,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ANALYTICS_PERSISTENCE_PORT, useExisting: PrismaService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        {
          provide: AppConfigService,
          useValue: {
            getAnalyticsCacheTtl: jest.fn().mockReturnValue(3600),
          },
        },
      ],
    }).compile();

    factory = module.get<ClinicalAnalyticsFactory>(ClinicalAnalyticsFactory);
    jest.clearAllMocks();
    mockPrismaService.getReadClient.mockReturnValue(mockReadClientValue);
  });

  it('computes coding compliance metrics using aggregate counts', async () => {
    mockAppointmentCount
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(80)
      .mockResolvedValueOnce(70)
      .mockResolvedValueOnce(60);
    mockDiagnosisCount.mockResolvedValue(150);
    mockProcedureCount.mockResolvedValueOnce(90).mockResolvedValueOnce(10);

    const result = await factory.getCodingComplianceMetrics('clinic-1');

    expect(result.totalVisits).toBe(100);
    expect(result.codedVisits).toBe(80);
    expect(result.billedVisits).toBe(70);
    expect(result.primaryDiagnosisRate).toBe(75);
    expect(result.avgDiagnosesPerVisit).toBe(1.5);
    expect(result.avgProceduresPerVisit).toBe(0.9);
    expect(result.proceduresWithoutPrice).toBe(10);
    expect(result.unbilledProceduresRate).toBeCloseTo(11.11, 2);
    expect(mockAppointmentFindMany).not.toHaveBeenCalled();
  });

  it('handles zero-count edge cases without NaN rates', async () => {
    mockAppointmentCount
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockDiagnosisCount.mockResolvedValue(0);
    mockProcedureCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0);

    const result = await factory.getCodingComplianceMetrics('clinic-1');

    expect(result.codingCompletenessRate).toBe(0);
    expect(result.billingRate).toBe(0);
    expect(result.primaryDiagnosisRate).toBe(0);
    expect(result.unbilledProceduresRate).toBe(0);
  });

  it('calculates coding timeliness using grouped first-diagnosis timestamps', async () => {
    mockQueryRaw.mockResolvedValue([
      { hours_to_code: 12 },
      { hours_to_code: 24 },
    ]);

    const result = await factory.getCodingTimeliness('clinic-1');

    expect(result).toEqual({
      avgTimeToCodeHours: 18,
      distribution: {
        within24h: 1,
        within48h: 1,
        within72h: 0,
        over72h: 0,
      },
      totalCoded: 2,
    });
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    expect(mockDiagnosisGroupBy).not.toHaveBeenCalled();
    expect(mockAppointmentFindMany).not.toHaveBeenCalled();
    expect(mockDirectAppointmentFindMany).not.toHaveBeenCalled();
  });

  it('returns empty coding timeliness metrics when no diagnoses exist', async () => {
    mockQueryRaw.mockResolvedValue([]);

    const result = await factory.getCodingTimeliness('clinic-1');

    expect(result).toEqual({
      avgTimeToCodeHours: 0,
      distribution: {
        within24h: 0,
        within48h: 0,
        within72h: 0,
        over72h: 0,
      },
      totalCoded: 0,
    });
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);
    expect(mockDiagnosisGroupBy).not.toHaveBeenCalled();
    expect(mockAppointmentFindMany).not.toHaveBeenCalled();
    expect(mockDirectAppointmentFindMany).not.toHaveBeenCalled();
  });
});
