import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaDashboardRepository } from './prisma-dashboard.repository';
import { PrismaService } from '@/prisma/prisma.service';
import type { IClock } from '@/shared/common/ports/clock.port';

describe('PrismaDashboardRepository', () => {
  const mockPatientCount = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockUserCount = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockAppointmentCount =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockPrescriptionCount =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockAppointmentFindMany =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const mockInvoiceAggregate =
    jest.fn<(...args: unknown[]) => Promise<unknown>>();

  const mockReadClient = {
    patient: {
      count: mockPatientCount,
    },
    user: {
      count: mockUserCount,
    },
    appointment: {
      count: mockAppointmentCount,
      findMany: mockAppointmentFindMany,
    },
    prescription: {
      count: mockPrescriptionCount,
    },
    invoice: {
      aggregate: mockInvoiceAggregate,
    },
  };

  const mockPrismaService = {
    getReadClient: jest.fn().mockReturnValue(mockReadClient),
  } as Pick<PrismaService, 'getReadClient'>;

  let repository: PrismaDashboardRepository;
  const fixedNow = new Date('2026-05-19T12:00:00.000Z');
  const clock: IClock = { now: () => fixedNow };

  beforeEach(() => {
    jest.clearAllMocks();
    const prismaService = Object.create(
      PrismaService.prototype,
    ) as PrismaService;
    prismaService.getReadClient = mockPrismaService.getReadClient;
    repository = new PrismaDashboardRepository(prismaService, clock);
  });

  it('builds stats using read client and deterministic sort order', async () => {
    const clinicId = 'clinic-1';
    const now = fixedNow;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    mockPatientCount.mockResolvedValueOnce(100).mockResolvedValueOnce(15);
    mockUserCount.mockResolvedValue(8);
    mockAppointmentCount
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(530)
      .mockResolvedValueOnce(3);
    mockPrescriptionCount.mockResolvedValue(42);
    mockAppointmentFindMany.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    mockInvoiceAggregate.mockResolvedValue({ _sum: { total: 12800 } });

    const result = await repository.getStatsSnapshot(clinicId);

    expect(result).toEqual({
      totalPatients: 100,
      totalDoctors: 8,
      newPatientsThisMonth: 15,
      todayAppointments: 12,
      totalAppointments: 530,
      activePrescriptions: 42,
      recentActivity: [],
      upcomingAppointments: [],
      uncodedVisits: 3,
      monthlyRevenue: 12800,
    });

    expect(mockPrismaService.getReadClient).toHaveBeenCalledTimes(1);
    expect(mockPatientCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          clinicId,
          createdAt: expect.objectContaining({
            gte: monthStart,
            lt: monthEnd,
          }),
        }),
      }),
    );
    expect(mockAppointmentFindMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    );
    expect(mockAppointmentFindMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
      }),
    );
  });
});
