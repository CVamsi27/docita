import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '@/prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('DashboardService', () => {
  let service: DashboardService;
  let _prisma: PrismaService;

  const mockPrismaService = {
    patient: {
      count: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    user: {
      count: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    appointment: {
      count: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    prescription: {
      count: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    labTestOrder: {
      count: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    invoice: {
      aggregate: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
  };

  const mockCacheManager = {
    get: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    set: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    del: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    reset: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    _prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStats', () => {
    it('should return empty stats if no clinicId provided', async () => {
      const result = await service.getStats('');
      expect(result).toEqual({
        totalPatients: 0,
        todayAppointments: 0,
        totalAppointments: 0,
        activePrescriptions: 0,
        recentActivity: [],
        upcomingAppointments: [],
      });
    });

    it('should return stats for a clinic', async () => {
      const clinicId = 'clinic-123';

      mockPrismaService.patient.count
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(10);

      mockPrismaService.user.count.mockResolvedValue(5);

      mockPrismaService.appointment.count
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(500);

      mockPrismaService.prescription.count.mockResolvedValue(25);
      mockPrismaService.labTestOrder.count.mockResolvedValue(3);
      mockPrismaService.invoice.aggregate.mockResolvedValue({
        _sum: { total: 5000 },
      });

      mockPrismaService.appointment.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getStats(clinicId);

      expect(result).toEqual({
        totalPatients: 100,
        totalDoctors: 5,
        newPatientsThisMonth: 10,
        todayAppointments: 8,
        activePrescriptions: 25,
        pendingReports: 3,
        monthlyRevenue: 5000,
        recentActivity: [],
        totalAppointments: 500,
        upcomingAppointments: [],
      });

      expect(mockPrismaService.patient.count).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.user.count).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.appointment.count).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.prescription.count).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.labTestOrder.count).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.invoice.aggregate).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.appointment.findMany).toHaveBeenCalledTimes(2);
    });
  });
});
