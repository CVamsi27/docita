import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionPdfService } from './prescription-pdf.service';
import { Specialization, HospitalRole, ApprovalStatus } from '@workspace/db';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IPrescriptionRepository } from './repositories/prescription.repository.interface';

describe('PrescriptionsService', () => {
  let service: PrescriptionsService;
  let repository: IPrescriptionRepository;
  let eventEmitter: EventEmitter2;

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
    approvalStatus: ApprovalStatus.PENDING,
    approvedById: null,
    approvedAt: null,
    whatsappSentAt: null,
    whatsappMessageId: null,
    whatsappStatus: null,
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

  const mockRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findPatientWithAllergies: jest.fn(),
  };

  beforeEach(async () => {
    const mockPdfService = {
      generate: jest.fn().mockResolvedValue(Buffer.from('PDF content')),
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionsService,
        {
          provide: 'IPrescriptionRepository',
          useValue: mockRepository,
        },
        { provide: PrescriptionPdfService, useValue: mockPdfService },
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<PrescriptionsService>(PrescriptionsService);
    repository = module.get<IPrescriptionRepository>('IPrescriptionRepository');
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return prescriptions for a clinic', async () => {
      jest.spyOn(repository, 'findAll').mockResolvedValue([mockPrescription]);

      const result = await service.findAll('clinic-123');

      expect(result).toEqual([mockPrescription]);
      expect(repository.findAll).toHaveBeenCalledWith({
        clinicId: 'clinic-123',
      });
    });

    it('should return empty array if no prescriptions found', async () => {
      jest.spyOn(repository, 'findAll').mockResolvedValue([]);
      const result = await service.findAll('clinic-123');

      expect(result).toEqual([]);
      expect(repository.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a prescription by id', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(mockPrescription);

      const result = await service.findOne('prescription-123');

      expect(result).toEqual(mockPrescription);
      expect(repository.findById).toHaveBeenCalledWith('prescription-123');
    });

    it('should throw NotFoundException if prescription not found', async () => {
      jest.spyOn(repository, 'findById').mockResolvedValue(null);

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
        .spyOn(repository, 'findPatientWithAllergies')
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

      jest.spyOn(repository, 'create').mockResolvedValue(mockPrescription);

      const result = await service.create(createData);

      expect(result).toEqual(mockPrescription);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          appointment: { connect: { id: createData.appointmentId } },
          patient: { connect: { id: createData.patientId } },
        }),
      );
    });

    it('should set default route to PO if not specified', async () => {
      const patientWithoutAllergies = {
        id: 'patient-123',
        firstName: 'John',
        lastName: 'Doe',
        patientAllergies: [],
      };

      jest
        .spyOn(repository, 'findPatientWithAllergies')
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

      jest.spyOn(repository, 'create').mockResolvedValue(mockPrescription);

      await service.create(createData);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          medications: {
            create: expect.arrayContaining([
              expect.objectContaining({
                route: 'PO',
              }),
            ]),
          },
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
        .spyOn(repository, 'findPatientWithAllergies')
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
        .spyOn(repository, 'findPatientWithAllergies')
        .mockResolvedValue(patientWithoutDrugAllergy as any);

      jest.spyOn(repository, 'create').mockResolvedValue(mockPrescription);

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
      expect(repository.create).toHaveBeenCalled();
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
        .spyOn(repository, 'findPatientWithAllergies')
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
        .spyOn(repository, 'findPatientWithAllergies')
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
  });
});
