import { Test, TestingModule } from '@nestjs/testing';
import { DoctorClinicsService } from './doctor-clinics.service';
import { PrismaService } from '@/prisma/prisma.service';

describe('DoctorClinicsService', () => {
  let service: DoctorClinicsService;
  let prismaService: PrismaService;

  const mockDoctor = {
    id: 'doctor-1',
    name: 'Dr. Smith',
    email: 'smith@clinic.com',
    role: 'DOCTOR',
  };

  const mockClinic = {
    id: 'clinic-1',
    name: 'Test Clinic',
    address: '123 Main St',
    phone: '+11234567890',
    email: 'contact@clinic.com',
    tier: 'PROFESSIONAL',
    logo: null,
  };

  const mockAssignment = {
    id: 'assignment-1',
    doctorId: 'doctor-1',
    clinicId: 'clinic-1',
    role: 'doctor',
    active: true,
    createdAt: new Date(),
    doctor: mockDoctor,
    clinic: mockClinic,
  };

  const mockPrismaService = {
    doctorClinic: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DoctorClinicsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DoctorClinicsService>(DoctorClinicsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('Dependency Injection', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should inject PrismaService', () => {
      expect(prismaService).toBeDefined();
    });
  });

  describe('assignDoctor', () => {
    it('should create new assignment when none exists', async () => {
      mockPrismaService.doctorClinic.findUnique.mockResolvedValue(null);
      mockPrismaService.doctorClinic.create.mockResolvedValue(mockAssignment);
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.assignDoctor('doctor-1', 'clinic-1');

      expect(mockPrismaService.doctorClinic.findUnique).toHaveBeenCalledWith({
        where: {
          doctorId_clinicId: {
            doctorId: 'doctor-1',
            clinicId: 'clinic-1',
          },
        },
      });
      expect(mockPrismaService.doctorClinic.create).toHaveBeenCalledWith({
        data: {
          doctorId: 'doctor-1',
          clinicId: 'clinic-1',
          role: 'doctor',
          active: true,
        },
        include: {
          doctor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
          clinic: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'doctor-1' },
        data: { clinicId: 'clinic-1' },
      });
      expect(result).toEqual(mockAssignment);
    });

    it('should update existing assignment when found', async () => {
      const existingAssignment = { ...mockAssignment, active: false };
      mockPrismaService.doctorClinic.findUnique.mockResolvedValue(
        existingAssignment,
      );
      mockPrismaService.doctorClinic.update.mockResolvedValue({
        ...existingAssignment,
        active: true,
      });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.assignDoctor(
        'doctor-1',
        'clinic-1',
        'admin',
      );

      expect(mockPrismaService.doctorClinic.update).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        data: { active: true, role: 'admin' },
      });
      expect(result.active).toBe(true);
    });

    it('should use default role "doctor" when not specified', async () => {
      mockPrismaService.doctorClinic.findUnique.mockResolvedValue(null);
      mockPrismaService.doctorClinic.create.mockResolvedValue(mockAssignment);
      mockPrismaService.user.update.mockResolvedValue({});

      await service.assignDoctor('doctor-1', 'clinic-1');

      expect(mockPrismaService.doctorClinic.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'doctor' }),
        }),
      );
    });

    it('should handle user update errors gracefully when creating assignment', async () => {
      mockPrismaService.doctorClinic.findUnique.mockResolvedValue(null);
      mockPrismaService.doctorClinic.create.mockResolvedValue(mockAssignment);
      mockPrismaService.user.update.mockRejectedValue(
        new Error('User not found'),
      );

      const result = await service.assignDoctor('doctor-1', 'clinic-1');

      expect(result).toEqual(mockAssignment);
    });

    it('should handle user update errors gracefully when updating assignment', async () => {
      mockPrismaService.doctorClinic.findUnique.mockResolvedValue(
        mockAssignment,
      );
      mockPrismaService.doctorClinic.update.mockResolvedValue(mockAssignment);
      mockPrismaService.user.update.mockRejectedValue(
        new Error('User not found'),
      );

      const result = await service.assignDoctor('doctor-1', 'clinic-1');

      expect(result).toEqual(mockAssignment);
    });

    it('should accept custom role parameter', async () => {
      mockPrismaService.doctorClinic.findUnique.mockResolvedValue(null);
      mockPrismaService.doctorClinic.create.mockResolvedValue({
        ...mockAssignment,
        role: 'admin',
      });
      mockPrismaService.user.update.mockResolvedValue({});

      await service.assignDoctor('doctor-1', 'clinic-1', 'admin');

      expect(mockPrismaService.doctorClinic.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'admin' }),
        }),
      );
    });
  });

  describe('removeDoctor', () => {
    it('should deactivate existing assignment', async () => {
      mockPrismaService.doctorClinic.findUnique.mockResolvedValue(
        mockAssignment,
      );
      mockPrismaService.doctorClinic.update.mockResolvedValue({
        ...mockAssignment,
        active: false,
      });

      const result = await service.removeDoctor('doctor-1', 'clinic-1');

      expect(mockPrismaService.doctorClinic.update).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        data: { active: false },
      });
      expect(result.active).toBe(false);
    });

    it('should throw error when assignment not found', async () => {
      mockPrismaService.doctorClinic.findUnique.mockResolvedValue(null);

      await expect(
        service.removeDoctor('doctor-1', 'clinic-1'),
      ).rejects.toThrow('Assignment not found');
    });
  });

  describe('getDoctorClinics', () => {
    it('should return active clinics for doctor', async () => {
      const mockResult = [
        {
          id: 'assignment-1',
          role: 'doctor',
          active: true,
          createdAt: new Date(),
          clinic: mockClinic,
        },
      ];
      mockPrismaService.doctorClinic.findMany.mockResolvedValue(mockResult);

      const result = await service.getDoctorClinics('doctor-1');

      expect(mockPrismaService.doctorClinic.findMany).toHaveBeenCalledWith({
        where: {
          doctorId: 'doctor-1',
          active: true,
        },
        select: {
          id: true,
          role: true,
          active: true,
          createdAt: true,
          clinic: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
              email: true,
              tier: true,
              logo: true,
            },
          },
        },
      });
      expect(result).toEqual(mockResult);
    });

    it('should return empty array when doctor has no clinics', async () => {
      mockPrismaService.doctorClinic.findMany.mockResolvedValue([]);

      const result = await service.getDoctorClinics('doctor-1');

      expect(result).toEqual([]);
    });
  });

  describe('getClinicDoctors', () => {
    it('should return active doctors for clinic', async () => {
      const mockResult = [mockAssignment];
      mockPrismaService.doctorClinic.findMany.mockResolvedValue(mockResult);

      const result = await service.getClinicDoctors('clinic-1');

      expect(mockPrismaService.doctorClinic.findMany).toHaveBeenCalledWith({
        where: {
          clinicId: 'clinic-1',
          active: true,
        },
        include: {
          doctor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });
      expect(result).toEqual(mockResult);
    });

    it('should return empty array when clinic has no doctors', async () => {
      mockPrismaService.doctorClinic.findMany.mockResolvedValue([]);

      const result = await service.getClinicDoctors('clinic-1');

      expect(result).toEqual([]);
    });
  });

  describe('updateRole', () => {
    it('should update role of existing assignment', async () => {
      mockPrismaService.doctorClinic.findUnique.mockResolvedValue(
        mockAssignment,
      );
      mockPrismaService.doctorClinic.update.mockResolvedValue({
        ...mockAssignment,
        role: 'admin',
      });

      const result = await service.updateRole('doctor-1', 'clinic-1', 'admin');

      expect(mockPrismaService.doctorClinic.update).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        data: { role: 'admin' },
      });
      expect(result.role).toBe('admin');
    });

    it('should throw error when assignment not found', async () => {
      mockPrismaService.doctorClinic.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRole('doctor-1', 'clinic-1', 'admin'),
      ).rejects.toThrow('Assignment not found');
    });
  });

  describe('Error Handling', () => {
    it('should propagate database errors from assignDoctor', async () => {
      const error = new Error('Database connection failed');
      mockPrismaService.doctorClinic.findUnique.mockRejectedValue(error);

      await expect(
        service.assignDoctor('doctor-1', 'clinic-1'),
      ).rejects.toThrow('Database connection failed');
    });

    it('should propagate database errors from getDoctorClinics', async () => {
      const error = new Error('Database error');
      mockPrismaService.doctorClinic.findMany.mockRejectedValue(error);

      await expect(service.getDoctorClinics('doctor-1')).rejects.toThrow(error);
    });
  });
});
