import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: PrismaService;

  const mockPrismaService = {
    patient: {
      count: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
    appointment: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    prescription: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prisma = module.get<PrismaService>(PrismaService);

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

      // Mock return values
      mockPrismaService.patient.count
        .mockResolvedValueOnce(100) // totalPatients
        .mockResolvedValueOnce(10); // newPatientsThisMonth

      mockPrismaService.user.count.mockResolvedValue(5); // totalDoctors

      mockPrismaService.appointment.count
        .mockResolvedValueOnce(8) // todayAppointments
        .mockResolvedValueOnce(500); // totalAppointments

      mockPrismaService.prescription.count.mockResolvedValue(25); // activePrescriptions

      mockPrismaService.appointment.findMany
        .mockResolvedValueOnce([]) // recentActivity
        .mockResolvedValueOnce([]); // upcomingAppointments

      const result = await service.getStats(clinicId);

      expect(result).toEqual({
        totalPatients: 100,
        totalDoctors: 5,
        newPatientsThisMonth: 10,
        todayAppointments: 8,
        activePrescriptions: 25,
        pendingReports: 0,
      });

      expect(mockPrismaService.patient.count).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.user.count).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.appointment.count).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.prescription.count).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.appointment.findMany).toHaveBeenCalledTimes(2);
    });
  });
});
