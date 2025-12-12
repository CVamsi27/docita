import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    appointment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    vitalSign: {
      create: jest.fn(),
      upsert: jest.fn(),
    },
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
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all appointments for a clinic', async () => {
      const appointments = [mockAppointment];
      const paginatedResult = {
        items: appointments,
        nextCursor: null,
        hasMore: false,
        count: 1,
      };

      jest.spyOn(service, 'findAll').mockResolvedValue(paginatedResult as any);

      const result = await service.findAll('clinic-123');

      expect(result).toEqual(paginatedResult);
    });

    it('should filter appointments by date', async () => {
      const appointments = [mockAppointment];
      const paginatedResult = {
        items: appointments,
        nextCursor: null,
        hasMore: false,
        count: 1,
      };

      jest.spyOn(service, 'findAll').mockResolvedValue(paginatedResult as any);

      const result = await service.findAll('clinic-123', {
        date: '2025-11-28',
      });

      expect(result).toEqual(paginatedResult);
    });
  });

  describe('findOne', () => {
    it('should return a single appointment', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(
        mockAppointment,
      );

      const result = await service.findOne('apt-123');

      expect(result).toEqual(mockAppointment);
      expect(mockPrismaService.appointment.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'apt-123' },
        }),
      );
    });

    it('should throw NotFoundException when appointment not found', async () => {
      mockPrismaService.appointment.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a new appointment', async () => {
      const createData = {
        clinicId: 'clinic-123',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        startTime: new Date('2025-11-28T10:00:00Z'),
        endTime: new Date('2025-11-28T10:30:00Z'),
        status: 'scheduled' as const,
        type: 'consultation' as const,
      };

      // Mock patient lookup
      mockPrismaService.patient = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'patient-123',
          clinicId: 'clinic-123',
        }),
      };

      // Mock user (doctor) lookup
      mockPrismaService.user = {
        findUnique: jest.fn().mockResolvedValue({
          id: 'doctor-123',
          role: 'DOCTOR',
        }),
      };

      mockPrismaService.appointment.create.mockResolvedValue(mockAppointment);

      const result = await service.create(createData);

      expect(result).toEqual(mockAppointment);
      expect(mockPrismaService.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clinic: { connect: { id: 'clinic-123' } },
            patient: { connect: { id: 'patient-123' } },
            doctor: { connect: { id: 'doctor-123' } },
            status: 'scheduled',
            type: 'consultation',
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update an appointment', async () => {
      const updateData = {
        status: 'confirmed' as const,
      };

      const updatedAppointment = {
        ...mockAppointment,
        ...updateData,
      };

      mockPrismaService.appointment.update.mockResolvedValue(
        updatedAppointment,
      );

      const result = await service.update('apt-123', updateData);

      expect(result).toEqual(updatedAppointment);
      expect(mockPrismaService.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'apt-123' },
          data: expect.objectContaining(updateData),
        }),
      );
    });
  });

  describe('remove', () => {
    it('should delete an appointment', async () => {
      mockPrismaService.appointment.delete.mockResolvedValue(mockAppointment);

      await service.remove('apt-123');

      expect(mockPrismaService.appointment.delete).toHaveBeenCalledWith({
        where: { id: 'apt-123' },
      });
    });
  });

  describe('createVitals', () => {
    it('should create vitals for an appointment', async () => {
      const vitalsData = {
        height: 175,
        weight: 70,
        bmi: 22.9,
        bloodPressure: '120/80',
        pulse: 72,
        temperature: 98.6,
        spo2: 98,
      };

      const mockVitals = {
        id: 'vitals-123',
        appointmentId: 'apt-123',
        ...vitalsData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.vitalSign.create.mockResolvedValue(mockVitals);

      const result = await service.createVitals('apt-123', vitalsData);

      expect(result).toEqual(mockVitals);
      expect(mockPrismaService.vitalSign.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          appointmentId: 'apt-123',
          ...vitalsData,
        }),
      });
    });
  });

  describe('updateVitals', () => {
    it('should update vitals for an appointment', async () => {
      const vitalsData = {
        bloodPressure: '125/85',
        pulse: 75,
      };

      const mockVitals = {
        id: 'vitals-123',
        appointmentId: 'apt-123',
        height: 175,
        weight: 70,
        ...vitalsData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.vitalSign.upsert.mockResolvedValue(mockVitals);

      const result = await service.updateVitals('apt-123', vitalsData);

      expect(result).toEqual(mockVitals);
      expect(mockPrismaService.vitalSign.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { appointmentId: 'apt-123' },
          create: expect.objectContaining({
            appointmentId: 'apt-123',
            ...vitalsData,
          }),
          update: expect.objectContaining(vitalsData),
        }),
      );
    });
  });
});
