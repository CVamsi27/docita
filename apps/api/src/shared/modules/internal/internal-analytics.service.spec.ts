import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { InternalAnalyticsService } from './internal-analytics.service';
import { PrismaService } from '@/prisma/prisma.service';
import { InvoiceStatus } from '@workspace/db';
import { MonitoringService } from '@/shared/modules/monitoring/monitoring/monitoring.service';
import { HealthService } from '@/shared/modules/monitoring/monitoring/health.service';
import { clockPortTestProvider } from '@/test-utils';

describe('InternalAnalyticsService', () => {
  let service: InternalAnalyticsService;

  const mockInvoiceAggregate =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockInvoiceFindMany =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockAppointmentCount =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockAppointmentGroupBy =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockAppointmentFindMany =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockPatientCount = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockPrescriptionCount =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();

  const mockReadClientValue = {
    invoice: {
      aggregate: mockInvoiceAggregate,
      findMany: mockInvoiceFindMany,
    },
    appointment: {
      count: mockAppointmentCount,
      groupBy: mockAppointmentGroupBy,
      findMany: mockAppointmentFindMany,
    },
    patient: {
      count: mockPatientCount,
    },
    prescription: {
      count: mockPrescriptionCount,
    },
  };

  const mockPrismaService = {
    getReadClient: jest.fn().mockReturnValue(mockReadClientValue),
  };

  const mockCacheManager = {
    get: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    set: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const mockMonitoringService = {
    getSystemHealth: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const mockHealthService = {
    getHealth: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InternalAnalyticsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: MonitoringService, useValue: mockMonitoringService },
        { provide: HealthService, useValue: mockHealthService },
        clockPortTestProvider(),
      ],
    }).compile();

    service = module.get<InternalAnalyticsService>(InternalAnalyticsService);
    jest.clearAllMocks();
    mockPrismaService.getReadClient.mockReturnValue(mockReadClientValue);
  });

  it('returns cached analytics without querying prisma', async () => {
    const cachedResponse = {
      revenue: 5000,
      appointments: 40,
      newPatients: 12,
      avgInvoiceValue: 800,
      revenueChange: 10,
      appointmentsChange: 5,
      patientsChange: -2,
    };
    mockCacheManager.get.mockResolvedValue(cachedResponse);

    const result = await service.getAnalytics(
      'monthly',
      '2026-03-01T00:00:00.000Z',
      '2026-03-31T00:00:00.000Z',
    );

    expect(result).toEqual(cachedResponse);
    expect(mockPrismaService.getReadClient).not.toHaveBeenCalled();
  });

  it('computes analytics with aggregate queries and caches the result', async () => {
    mockCacheManager.get.mockResolvedValue(null);
    mockInvoiceAggregate
      .mockResolvedValueOnce({
        _sum: { total: 2000 },
        _avg: { total: 500 },
      })
      .mockResolvedValueOnce({
        _sum: { total: 1000 },
      });
    mockAppointmentCount.mockResolvedValueOnce(20).mockResolvedValueOnce(10);
    mockPatientCount.mockResolvedValueOnce(5).mockResolvedValueOnce(10);

    const result = await service.getAnalytics(
      'monthly',
      '2026-03-01T00:00:00.000Z',
      '2026-03-31T00:00:00.000Z',
    );

    expect(result).toEqual({
      revenue: 2000,
      appointments: 20,
      newPatients: 5,
      avgInvoiceValue: 500,
      revenueChange: 100,
      appointmentsChange: 100,
      patientsChange: -50,
    });
    expect(mockPrismaService.getReadClient).toHaveBeenCalledTimes(1);
    expect(mockInvoiceAggregate).toHaveBeenCalledTimes(2);
    expect(mockInvoiceFindMany).not.toHaveBeenCalled();
    expect(mockAppointmentCount).toHaveBeenCalledTimes(2);
    expect(mockPatientCount).toHaveBeenCalledTimes(2);
    expect(mockInvoiceAggregate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: expect.objectContaining({
          status: InvoiceStatus.PAID,
        }),
        _sum: { total: true },
        _avg: { total: true },
      }),
    );
    expect(mockCacheManager.set).toHaveBeenCalledWith(
      expect.stringContaining('internal:analytics:monthly:'),
      expect.objectContaining({
        revenue: 2000,
      }),
      300000,
    );
  });

  it('computes usage metrics from grouped doctor activity and counts', async () => {
    mockCacheManager.get.mockResolvedValue(null);
    mockAppointmentGroupBy
      .mockResolvedValueOnce([
        { doctorId: 'doctor-1' },
        { doctorId: 'doctor-2' },
      ])
      .mockResolvedValueOnce([{ doctorId: 'doctor-1' }]);
    mockAppointmentCount.mockResolvedValueOnce(8).mockResolvedValueOnce(100);
    mockPrescriptionCount.mockResolvedValueOnce(3).mockResolvedValueOnce(40);

    const result = await service.getUsageMetrics();

    expect(result).toEqual({
      dau: 2,
      mau: 1,
      appointmentsToday: 8,
      appointmentsThisMonth: 100,
      prescriptionsToday: 3,
      prescriptionsThisMonth: 40,
    });
    expect(mockAppointmentGroupBy).toHaveBeenCalledTimes(2);
    expect(mockAppointmentFindMany).not.toHaveBeenCalled();
    expect(mockAppointmentCount).toHaveBeenCalledTimes(2);
    expect(mockPrescriptionCount).toHaveBeenCalledTimes(2);
    expect(mockCacheManager.set).toHaveBeenCalledWith(
      'internal:usage-metrics',
      expect.objectContaining({
        dau: 2,
      }),
      300000,
    );
  });
});
