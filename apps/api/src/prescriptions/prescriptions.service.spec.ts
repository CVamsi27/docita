import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PrescriptionsService', () => {
  let service: PrescriptionsService;
  let prismaService: PrismaService;

  const mockPrescription = {
    id: 'prescription-123',
    appointmentId: 'appointment-123',
    patientId: 'patient-123',
    doctorId: 'doctor-123',
    instructions: 'Take with food',
    createdAt: new Date(),
    updatedAt: new Date(),
    medications: [
      {
        id: 'med-1',
        name: 'Aspirin',
        dosage: '500mg',
        frequency: 'Twice daily',
        duration: '7 days',
        route: 'PO',
      },
    ],
    patient: {
      id: 'patient-123',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '1234567890',
      email: 'john@example.com',
      gender: 'MALE',
      dateOfBirth: new Date('1990-01-01'),
      clinic: {
        id: 'clinic-123',
        name: 'Test Clinic',
        address: '123 Test St',
        phone: '9876543210',
        email: 'clinic@test.com',
        logo: null,
      },
    },
    doctor: {
      id: 'doctor-123',
      name: 'Dr. Smith',
      email: 'doctor@test.com',
      qualification: 'MD',
      registrationNumber: 'REG001',
      signatureUrl: null,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionsService,
        {
          provide: PrismaService,
          useValue: {
            prescription: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PrescriptionsService>(PrescriptionsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return prescriptions for a clinic', async () => {
      jest
        .spyOn(prismaService.prescription, 'findMany')
        .mockResolvedValue([mockPrescription]);

      const result = await service.findAll('clinic-123');

      expect(result).toEqual([mockPrescription]);
      expect(prismaService.prescription.findMany).toHaveBeenCalledWith({
        where: { patient: { clinicId: 'clinic-123' } },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if no clinicId provided', async () => {
      const result = await service.findAll('');

      expect(result).toEqual([]);
      expect(prismaService.prescription.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a prescription by id', async () => {
      jest
        .spyOn(prismaService.prescription, 'findUnique')
        .mockResolvedValue(mockPrescription);

      const result = await service.findOne('prescription-123');

      expect(result).toEqual(mockPrescription);
      expect(prismaService.prescription.findUnique).toHaveBeenCalledWith({
        where: { id: 'prescription-123' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if prescription not found', async () => {
      jest
        .spyOn(prismaService.prescription, 'findUnique')
        .mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a prescription with medications', async () => {
      const createData = {
        appointmentId: 'appointment-123',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        instructions: 'Take with food',
        medications: [
          {
            name: 'Aspirin',
            dosage: '500mg',
            frequency: 'Twice daily',
            duration: '7 days',
          },
        ],
      };

      jest
        .spyOn(prismaService.prescription, 'create')
        .mockResolvedValue(mockPrescription);

      const result = await service.create(createData);

      expect(result).toEqual(mockPrescription);
      expect(prismaService.prescription.create).toHaveBeenCalledWith({
        data: {
          appointmentId: createData.appointmentId,
          patientId: createData.patientId,
          doctorId: createData.doctorId,
          instructions: createData.instructions,
          medications: {
            create: expect.arrayContaining([
              expect.objectContaining({
                name: 'Aspirin',
                dosage: '500mg',
                frequency: 'Twice daily',
                duration: '7 days',
                route: 'PO',
              }),
            ]),
          },
        },
        include: { medications: true },
      });
    });

    it('should set default route to PO if not specified', async () => {
      const createData = {
        appointmentId: 'appointment-123',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        medications: [
          {
            name: 'Aspirin',
            dosage: '500mg',
            frequency: 'Twice daily',
            duration: '7 days',
          },
        ],
      };

      jest
        .spyOn(prismaService.prescription, 'create')
        .mockResolvedValue(mockPrescription);

      await service.create(createData);

      expect(prismaService.prescription.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            medications: {
              create: expect.arrayContaining([
                expect.objectContaining({
                  route: 'PO',
                }),
              ]),
            },
          }),
        }),
      );
    });
  });
});
