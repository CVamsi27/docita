import { Test, TestingModule } from '@nestjs/testing';
import { PatientsService } from './patients.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('PatientsService', () => {
  let service: PatientsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    patient: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
    },
    document: {
      findMany: jest.fn(),
    },
  };

  const mockPatient = {
    id: 'patient-123',
    firstName: 'John',
    lastName: 'Doe',
    phoneNumber: '1234567890',
    email: 'john@example.com',
    gender: 'MALE',
    dateOfBirth: new Date('1990-01-01'),
    clinicId: 'clinic-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return patients for a clinic', async () => {
      mockPrismaService.patient.findMany.mockResolvedValue([mockPatient]);

      const result = await service.findAll('clinic-123');

      expect(result).toEqual([mockPatient]);
      expect(mockPrismaService.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinicId: 'clinic-123' },
        }),
      );
    });

    it('should return empty array if no clinicId provided', async () => {
      const result = await service.findAll('');
      expect(result).toEqual([]);
    });

    it('should filter by search query', async () => {
      mockPrismaService.patient.findMany.mockResolvedValue([mockPatient]);

      await service.findAll('clinic-123', { search: 'John' });

      expect(mockPrismaService.patient.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { firstName: { contains: 'John', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a patient', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValue(mockPatient);

      const result = await service.findOne('patient-123');

      expect(result).toEqual(mockPatient);
      expect(mockPrismaService.patient.findUnique).toHaveBeenCalledWith({
        where: { id: 'patient-123' },
      });
    });

    it('should throw NotFoundException if patient not found', async () => {
      mockPrismaService.patient.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a patient', async () => {
      const createData = {
        firstName: 'John',
        lastName: 'Doe',
        phoneNumber: '1234567890',
        gender: 'MALE',
        dateOfBirth: '1990-01-01',
        clinicId: 'clinic-123',
      };

      mockPrismaService.patient.create.mockResolvedValue(mockPatient);

      const result = await service.create(createData);

      expect(result).toEqual(mockPatient);
      expect(mockPrismaService.patient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firstName: 'John',
            lastName: 'Doe',
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update a patient', async () => {
      const updateData = { firstName: 'Jane' };
      const updatedPatient = { ...mockPatient, ...updateData };

      mockPrismaService.patient.update.mockResolvedValue(updatedPatient);

      const result = await service.update('patient-123', updateData);

      expect(result).toEqual(updatedPatient);
      expect(mockPrismaService.patient.update).toHaveBeenCalledWith({
        where: { id: 'patient-123' },
        data: expect.objectContaining(updateData),
      });
    });
  });

  describe('remove', () => {
    it('should delete a patient', async () => {
      mockPrismaService.patient.delete.mockResolvedValue(mockPatient);

      await service.remove('patient-123');

      expect(mockPrismaService.patient.delete).toHaveBeenCalledWith({
        where: { id: 'patient-123' },
      });
    });
  });

  describe('getAppointments', () => {
    it('should return patient appointments', async () => {
      const appointments = [{ id: 'apt-1' }];
      mockPrismaService.appointment.findMany.mockResolvedValue(appointments);

      const result = await service.getAppointments('patient-123');

      expect(result).toEqual(appointments);
      expect(mockPrismaService.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientId: 'patient-123' },
        }),
      );
    });
  });

  describe('getDocuments', () => {
    it('should return patient documents', async () => {
      const documents = [{ id: 'doc-1' }];
      mockPrismaService.document.findMany.mockResolvedValue(documents);

      const result = await service.getDocuments('patient-123');

      expect(result).toEqual(documents);
      expect(mockPrismaService.document.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientId: 'patient-123' },
        }),
      );
    });
  });
});
