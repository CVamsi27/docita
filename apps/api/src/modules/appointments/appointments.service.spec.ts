import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsService } from './appointments.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { IAppointmentRepository } from './repositories/appointment.repository.interface';
import { VitalsFactory } from '../patients/factories/vitals.factory';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let repository: jest.Mocked<IAppointmentRepository>;
  let prisma: PrismaService;
  let vitalsFactory: jest.Mocked<VitalsFactory>;

  const mockAppointmentRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findOverlapping: jest.fn(),
  };

  const mockPrismaService = {
    patient: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    appointment: {
      findUnique: jest.fn(),
    },
    vitalSign: {
      create: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockVitalsFactory = {
    create: jest.fn(),
  };

  const mockAppointment = {
    id: 'apt-123',
    clinicId: 'clinic-123',
    patientId: 'patient-123',
    doctorId: 'doctor-123',
    startTime: new Date('2025-11-28T10:00:00Z'),
    endTime: new Date('2025-11-28T10:30:00Z'),
    status: 'scheduled',
    type: 'consultation',
    createdAt: new Date(),
    updatedAt: new Date(),
    patient: {
      id: 'patient-123',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '1234567890',
    },
    doctor: {
      id: 'doctor-123',
      name: 'Dr. Smith',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: 'IAppointmentRepository',
          useValue: mockAppointmentRepository,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: VitalsFactory,
          useValue: mockVitalsFactory,
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    repository = module.get('IAppointmentRepository');
    prisma = module.get<PrismaService>(PrismaService);
    vitalsFactory = module.get(VitalsFactory);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should delegate to repository with correct params', async () => {
      const paginatedResult = {
        items: [mockAppointment],
        nextCursor: undefined, // Fix: Use undefined to match interface
        hasMore: false,
        count: 1,
      };

      mockAppointmentRepository.findAll.mockResolvedValue(
        paginatedResult as any,
      );

      const result = await service.findAll('clinic-123', {
        date: '2025-11-28',
        limit: 10,
      });

      expect(repository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          clinicId: 'clinic-123',
          date: '2025-11-28',
          limit: 10,
        }),
      );
      expect(result).toEqual(paginatedResult);
    });

    it('should handle date strings correctly', async () => {
      mockAppointmentRepository.findAll.mockResolvedValue({
        items: [],
        nextCursor: undefined, // Fix: undefined matches optional string
        hasMore: false,
        count: 0,
      } as any);

      await service.findAll('clinic-123', {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      });

      expect(repository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31'),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return appointment from repository', async () => {
      mockAppointmentRepository.findById.mockResolvedValue(
        mockAppointment as any,
      );

      const result = await service.findOne('apt-123');
      expect(result).toEqual(mockAppointment);
      expect(repository.findById).toHaveBeenCalledWith('apt-123');
    });

    it('should throw NotFoundException if not found', async () => {
      mockAppointmentRepository.findById.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create appointment after validation', async () => {
      const createData = {
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        clinicId: 'clinic-123',
        startTime: '2025-11-28T10:00:00Z', // String input from controller
        endTime: '2025-11-28T10:30:00Z',
        status: 'scheduled',
        type: 'consultation',
      };

      // Mock Validations
      mockPrismaService.patient.findUnique.mockResolvedValue({
        id: 'patient-123',
        clinicId: 'clinic-123',
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'doctor-123',
        role: 'DOCTOR',
      });
      mockAppointmentRepository.findOverlapping.mockResolvedValue([]);
      mockAppointmentRepository.create.mockResolvedValue(
        mockAppointment as any,
      );

      const result = await service.create(createData as any);

      // Verify validation calls
      expect(prisma.patient.findUnique).toHaveBeenCalled();
      expect(prisma.user.findUnique).toHaveBeenCalled();

      // Verify conflict check
      expect(repository.findOverlapping).toHaveBeenCalled();

      // Verify create call
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'scheduled',
          type: 'consultation',
        }),
      );
    });

    it('should throw ConflictException on overlapping', async () => {
      const createData = {
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        clinicId: 'clinic-123',
        startTime: '2025-11-28T10:00:00Z',
        endTime: '2025-11-28T10:30:00Z',
        status: 'scheduled',
        type: 'consultation',
      };

      mockPrismaService.patient.findUnique.mockResolvedValue({
        id: 'patient-123',
        clinicId: 'clinic-123',
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'doctor-123',
        role: 'DOCTOR',
        name: 'Dr. Doom',
      });

      // Simulating Overlap
      mockAppointmentRepository.findOverlapping.mockResolvedValue([
        mockAppointment,
      ] as any);

      await expect(service.create(createData as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should delegate to repository delete', async () => {
      await service.remove('apt-123');
      expect(repository.delete).toHaveBeenCalledWith('apt-123');
    });
  });
});
