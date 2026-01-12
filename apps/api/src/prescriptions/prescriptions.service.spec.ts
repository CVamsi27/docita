import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsappService } from '../modules/whatsapp/whatsapp.service';
import { PDFGeneratorService } from '../common/services/pdf-generator.service';
import { Specialization, Role, HospitalRole } from '@workspace/db';

describe('PrescriptionsService', () => {
  let service: PrescriptionsService;
  let prismaService: PrismaService;

  const mockPrescription = {
    id: 'prescription-123',
    appointmentId: 'appointment-123',
    patientId: 'patient-123',
    doctorId: 'doctor-123',
    instructions: 'Take with food',
    date: new Date(),
    doctorName: 'Dr. Smith',
    doctorEmail: 'doctor@test.com',
    doctorPhone: '555-0123',
    doctorSpecialization: Specialization.GENERAL_PRACTICE,
    doctorRole: HospitalRole.CONSULTANT,
    doctorRegistrationNumber: 'REG001',
    doctorLicenseNumber: 'LIC001',
    clinicId: 'clinic-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    approvalStatus: 'PENDING',
    approvedById: null,
    approvedAt: null,
    whatsappSentAt: null,
    whatsappMessageId: null,
    doctorQualification: 'MD',
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
    const mockPDFGenerator = {
      generatePrescription: jest
        .fn()
        .mockResolvedValue(Buffer.from('PDF content')),
    };

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
            patient: {
              findUnique: jest.fn(),
            },
            clinic: {
              findUnique: jest.fn(),
            },
            whatsappLog: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: WhatsappService,
          useValue: {
            sendMessage: jest.fn().mockResolvedValue({ success: true }),
            isConfiguredForClinic: jest.fn().mockReturnValue(false),
          },
        },
        PDFGeneratorService,
        { provide: PDFGeneratorService, useValue: mockPDFGenerator },
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
      const patientWithoutAllergies = {
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        patientAllergies: [],
      };

      jest
        .spyOn(prismaService.patient, 'findUnique')
        .mockResolvedValue(patientWithoutAllergies as any);

      const createData = {
        appointmentId: 'appointment-123',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        instructions: 'Take with food',
        medications: [
          {
            name: 'Ibuprofen',
            dosage: '400mg',
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
          doctorName: undefined,
          doctorEmail: undefined,
          doctorPhone: undefined,
          doctorSpecialization: null,
          doctorRole: null,
          doctorRegistrationNumber: undefined,
          doctorLicenseNumber: undefined,
          medications: {
            create: [
              {
                name: 'Ibuprofen',
                dosage: '400mg',
                frequency: 'Twice daily',
                duration: '7 days',
                route: 'PO',
              },
            ],
          },
        },
        include: {
          medications: true,
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
            },
          },
        },
      });
    });

    it('should set default route to PO if not specified', async () => {
      const patientWithoutAllergies = {
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        patientAllergies: [],
      };

      jest
        .spyOn(prismaService.patient, 'findUnique')
        .mockResolvedValue(patientWithoutAllergies as any);

      const createData = {
        appointmentId: 'appointment-123',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        medications: [
          {
            name: 'Ibuprofen',
            dosage: '400mg',
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

  describe('Allergy Checking', () => {
    it('should block prescription if patient has critical allergy to medication', async () => {
      const patientWithAllergy = {
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        patientAllergies: [
          {
            allergen: 'Penicillin',
            allergyType: 'DRUG',
            severity: 'SEVERE',
            reaction: 'Anaphylaxis',
          },
        ],
      };

      jest
        .spyOn(prismaService.patient, 'findUnique')
        .mockResolvedValue(patientWithAllergy as any);

      const createData = {
        appointmentId: 'appointment-123',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        medications: [
          {
            name: 'Amoxicillin',
            dosage: '500mg',
            frequency: 'TID',
            duration: '7 days',
            route: 'PO',
          },
        ],
      };

      await expect(service.create(createData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should block prescription for direct allergy match', async () => {
      const patientWithAllergy = {
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        patientAllergies: [
          {
            allergen: 'Aspirin',
            allergyType: 'DRUG',
            severity: 'LIFE_THREATENING',
            reaction: 'Severe bleeding',
          },
        ],
      };

      jest
        .spyOn(prismaService.patient, 'findUnique')
        .mockResolvedValue(patientWithAllergy as any);

      const createData = {
        appointmentId: 'appointment-123',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        medications: [
          {
            name: 'Aspirin',
            dosage: '100mg',
            frequency: 'OD',
            duration: '30 days',
            route: 'PO',
          },
        ],
      };

      await expect(service.create(createData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow prescription if patient has no drug allergies', async () => {
      const patientWithoutDrugAllergy = {
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        patientAllergies: [
          {
            allergen: 'Peanuts',
            allergyType: 'FOOD',
            severity: 'MODERATE',
            reaction: 'Hives',
          },
        ],
      };

      jest
        .spyOn(prismaService.patient, 'findUnique')
        .mockResolvedValue(patientWithoutDrugAllergy as any);

      jest
        .spyOn(prismaService.prescription, 'create')
        .mockResolvedValue(mockPrescription);

      const createData = {
        appointmentId: 'appointment-123',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        medications: [
          {
            name: 'Ibuprofen',
            dosage: '400mg',
            frequency: 'TID',
            duration: '5 days',
            route: 'PO',
          },
        ],
      };

      const result = await service.create(createData);
      expect(result).toBeDefined();
      expect(prismaService.prescription.create).toHaveBeenCalled();
    });

    it('should block prescription for cross-reactive cephalosporin if patient allergic to penicillin', async () => {
      const patientWithPenicillinAllergy = {
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        patientAllergies: [
          {
            allergen: 'Penicillin',
            allergyType: 'DRUG',
            severity: 'SEVERE',
            reaction: 'Anaphylaxis',
          },
        ],
      };

      jest
        .spyOn(prismaService.patient, 'findUnique')
        .mockResolvedValue(patientWithPenicillinAllergy as any);

      const createData = {
        appointmentId: 'appointment-123',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        medications: [
          {
            name: 'Cephalexin',
            dosage: '500mg',
            frequency: 'QID',
            duration: '10 days',
            route: 'PO',
          },
        ],
      };

      await expect(service.create(createData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject prescription with invalid dosage', async () => {
      const patientWithoutAllergies = {
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        patientAllergies: [],
      };

      jest
        .spyOn(prismaService.patient, 'findUnique')
        .mockResolvedValue(patientWithoutAllergies as any);

      const createData = {
        appointmentId: 'appointment-123',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        medications: [
          {
            name: 'Paracetamol',
            dosage: '5000mg', // Exceeds max 1000mg per dose
            frequency: 'TID',
            duration: '7 days',
            route: 'PO',
          },
        ],
      };

      await expect(service.create(createData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject prescription with invalid dosage', async () => {
      const patientWithoutAllergies = {
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        patientAllergies: [],
      };

      jest
        .spyOn(prismaService.patient, 'findUnique')
        .mockResolvedValue(patientWithoutAllergies as any);

      const createData = {
        appointmentId: 'appointment-123',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        medications: [
          {
            name: 'Paracetamol',
            dosage: '5000mg', // Exceeds max 1000mg per dose
            frequency: 'TID',
            duration: '7 days',
            route: 'PO',
          },
        ],
      };

      await expect(service.create(createData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should block carbapenem for penicillin-allergic patient', async () => {
      const patientWithPenicillinAllergy = {
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        patientAllergies: [
          {
            allergen: 'Penicillin',
            allergyType: 'DRUG',
            severity: 'SEVERE',
            reaction: 'Anaphylaxis',
          },
        ],
      };

      jest
        .spyOn(prismaService.patient, 'findUnique')
        .mockResolvedValue(patientWithPenicillinAllergy as any);

      const createData = {
        appointmentId: 'appointment-123',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        medications: [
          {
            name: 'Meropenem',
            dosage: '1000mg',
            frequency: 'Q8H',
            duration: '7 days',
            route: 'IV',
          },
        ],
      };

      await expect(service.create(createData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should block fluoroquinolone direct match', async () => {
      const patientWithQuinoloneAllergy = {
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        patientAllergies: [
          {
            allergen: 'Ciprofloxacin',
            allergyType: 'DRUG',
            severity: 'SEVERE',
            reaction: 'Tendon rupture',
          },
        ],
      };

      jest
        .spyOn(prismaService.patient, 'findUnique')
        .mockResolvedValue(patientWithQuinoloneAllergy as any);

      const createData = {
        appointmentId: 'appointment-123',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        medications: [
          {
            name: 'Levofloxacin',
            dosage: '500mg',
            frequency: 'OD',
            duration: '10 days',
            route: 'PO',
          },
        ],
      };

      await expect(service.create(createData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should block sulfonylurea for sulfa-allergic patient', async () => {
      const patientWithSulfaAllergy = {
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        patientAllergies: [
          {
            allergen: 'Sulfamethoxazole',
            allergyType: 'DRUG',
            severity: 'SEVERE',
            reaction: 'Stevens-Johnson syndrome',
          },
        ],
      };

      jest
        .spyOn(prismaService.patient, 'findUnique')
        .mockResolvedValue(patientWithSulfaAllergy as any);

      const createData = {
        appointmentId: 'appointment-123',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        medications: [
          {
            name: 'Glipizide',
            dosage: '5mg',
            frequency: 'BID',
            duration: '30 days',
            route: 'PO',
          },
        ],
      };

      await expect(service.create(createData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow macrolide for penicillin-allergic patient', async () => {
      const patientWithPenicillinAllergy = {
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        patientAllergies: [
          {
            allergen: 'Penicillin',
            allergyType: 'DRUG',
            severity: 'MODERATE',
            reaction: 'Rash',
          },
        ],
      };

      jest
        .spyOn(prismaService.patient, 'findUnique')
        .mockResolvedValue(patientWithPenicillinAllergy as any);

      jest
        .spyOn(prismaService.prescription, 'create')
        .mockResolvedValue(mockPrescription);

      const createData = {
        appointmentId: 'appointment-123',
        patientId: 'patient-123',
        doctorId: 'doctor-123',
        medications: [
          {
            name: 'Azithromycin',
            dosage: '500mg',
            frequency: 'OD',
            duration: '3 days',
            route: 'PO',
          },
        ],
      };

      const result = await service.create(createData);
      expect(result).toBeDefined();
      expect(prismaService.prescription.create).toHaveBeenCalled();
    });
  });
});
