import { Test, TestingModule } from '@nestjs/testing';
import { FhirService } from './fhir.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FhirPatientFactory } from './factories/fhir-patient.factory';
import { FhirObservationFactory } from './factories/fhir-observation.factory';
import { FhirMedicationFactory } from './factories/fhir-medication.factory';
import { FhirConditionFactory } from './factories/fhir-condition.factory';
import { FhirAllergyFactory } from './factories/fhir-allergy.factory';
import { FhirImmunizationFactory } from './factories/fhir-immunization.factory';
import { NotFoundException } from '@nestjs/common';

describe('FhirService', () => {
  let service: FhirService;
  let prisma: PrismaService;
  let patientFactory: FhirPatientFactory;

  const mockPrismaService = {
    patient: {
      findFirst: jest.fn(),
    },
    vitalSign: {
      findMany: jest.fn(),
    },
    prescription: {
      findMany: jest.fn(),
    },
    patientMedicalCondition: {
      findMany: jest.fn(),
    },
    diagnosis: {
      findMany: jest.fn(),
    },
    patientAllergy: {
      findMany: jest.fn(),
    },
    immunization: {
      findMany: jest.fn(),
    },
  };

  const mockFactory = {
    create: jest.fn(),
    createMany: jest.fn(),
    createFromConditions: jest.fn(),
    createFromDiagnoses: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FhirService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: FhirPatientFactory, useValue: mockFactory },
        { provide: FhirObservationFactory, useValue: mockFactory },
        { provide: FhirMedicationFactory, useValue: mockFactory },
        { provide: FhirConditionFactory, useValue: mockFactory },
        { provide: FhirAllergyFactory, useValue: mockFactory },
        { provide: FhirImmunizationFactory, useValue: mockFactory },
      ],
    }).compile();

    service = module.get<FhirService>(FhirService);
    prisma = module.get<PrismaService>(PrismaService);
    patientFactory = module.get<FhirPatientFactory>(FhirPatientFactory);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPatientResource', () => {
    it('should return a FHIR patient when found', async () => {
      const mockPatient = { id: 'p1', firstName: 'John' };
      const mockFhirPatient = { resourceType: 'Patient', id: 'p1' };

      mockPrismaService.patient.findFirst.mockResolvedValue(mockPatient);
      mockFactory.create.mockReturnValue(mockFhirPatient);

      const result = await service.getPatientResource('p1', 'c1');

      expect(prisma.patient.findFirst).toHaveBeenCalledWith({
        where: { id: 'p1', clinicId: 'c1' },
      });
      expect(patientFactory.create).toHaveBeenCalledWith(mockPatient);
      expect(result).toEqual(mockFhirPatient);
    });

    it('should throw NotFoundException if patient not found', async () => {
      mockPrismaService.patient.findFirst.mockResolvedValue(null);

      await expect(service.getPatientResource('p1', 'c1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getImmunizations', () => {
    it('should return mapped immunizations', async () => {
      const mockImmunizations = [{ id: 'i1' }];
      const mockFhirImmunizations = [
        { resourceType: 'Immunization', id: 'i1' },
      ];

      mockPrismaService.immunization.findMany.mockResolvedValue(
        mockImmunizations,
      );
      mockFactory.createMany.mockReturnValue(mockFhirImmunizations);

      const result = await service.getImmunizations('p1', 'c1');

      expect(prisma.immunization.findMany).toHaveBeenCalledWith({
        where: { patientId: 'p1', patient: { clinicId: 'c1' } },
        orderBy: { administeredDate: 'desc' },
      });
      expect(result).toEqual(mockFhirImmunizations);
    });
  });
});
