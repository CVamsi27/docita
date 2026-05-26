import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { DASHBOARD_REPOSITORY_TOKEN } from '@/domains/dashboards/dashboard/core/repositories/dashboard.repository.interface';

describe('DashboardService', () => {
  let service: DashboardService;
  const mockDashboardRepository = {
    getStatsSnapshot: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
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
          provide: DASHBOARD_REPOSITORY_TOKEN,
          useValue: mockDashboardRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);

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

      mockDashboardRepository.getStatsSnapshot.mockResolvedValue({
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

      expect(mockDashboardRepository.getStatsSnapshot).toHaveBeenCalledWith(
        clinicId,
      );
    });
  });
});
