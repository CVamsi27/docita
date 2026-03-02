import { Test, TestingModule } from '@nestjs/testing';
import { FhirPatientFactory } from './fhir-patient.factory';
import { Patient, Gender } from '@workspace/db';

describe('FhirPatientFactory', () => {
  let factory: FhirPatientFactory;

  const mockPatient: Patient = {
    id: 'patient-123',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('1990-05-15'),
    gender: Gender.MALE,
    mrn: 'MRN-12345',
    email: 'john@example.com',
    phoneNumber: '+1234567890',
    address: '123 Main St',
    clinicId: 'clinic-123',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-02-01'),
    deletedAt: null,
  } as Patient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FhirPatientFactory],
    }).compile();

    factory = module.get<FhirPatientFactory>(FhirPatientFactory);
  });

  describe('create', () => {
    it('should create FHIR patient with required fields', () => {
      const fhirPatient = factory.create(mockPatient);

      expect(fhirPatient.resourceType).toBe('Patient');
      expect(fhirPatient.id).toBe('patient-123');
      expect(fhirPatient.active).toBe(true);
    });

    it('should set meta information correctly', () => {
      const fhirPatient = factory.create(mockPatient);

      expect(fhirPatient.meta).toBeDefined();
      expect(fhirPatient.meta?.lastUpdated).toBe(
        mockPatient.updatedAt.toISOString(),
      );
      expect(fhirPatient.meta?.profile).toContain(
        'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient',
      );
    });

    it('should set patient name correctly', () => {
      const fhirPatient = factory.create(mockPatient);

      expect(fhirPatient.name).toBeDefined();
      expect(fhirPatient.name?.[0]?.use).toBe('official');
      expect(fhirPatient.name?.[0]?.family).toBe('Doe');
      expect(fhirPatient.name?.[0]?.given).toContain('John');
    });

    it('should set birth date in ISO format YYYY-MM-DD', () => {
      const fhirPatient = factory.create(mockPatient);

      expect(fhirPatient.birthDate).toBe('1990-05-15');
    });

    it('should add MRN identifier if present', () => {
      const fhirPatient = factory.create(mockPatient);

      const mrnIdentifier = fhirPatient.identifier?.find(
        (id) => id.type?.coding?.[0]?.code === 'MR',
      );

      expect(mrnIdentifier).toBeDefined();
      expect(mrnIdentifier?.use).toBe('usual');
      expect(mrnIdentifier?.value).toBe('MRN-12345');
    });

    it('should add email contact if present', () => {
      const fhirPatient = factory.create(mockPatient);

      const emailTelecom = fhirPatient.telecom?.find(
        (t) => t.system === 'email',
      );

      expect(emailTelecom).toBeDefined();
      expect(emailTelecom?.value).toBe('john@example.com');
    });

    it('should add phone contact if present', () => {
      const fhirPatient = factory.create(mockPatient);

      const phoneTelecom = fhirPatient.telecom?.find(
        (t) => t.system === 'phone',
      );

      expect(phoneTelecom).toBeDefined();
      expect(phoneTelecom?.value).toBe('+1234567890');
    });

    it('should add address extension if present', () => {
      const fhirPatient = factory.create(mockPatient);

      expect(fhirPatient.address).toBeDefined();
      expect(fhirPatient.address?.[0]?.text).toBe(mockPatient.address);
    });

    it('should handle patient without optional fields', () => {
      const minimalPatient = {
        ...mockPatient,
        mrn: null,
        email: null,
        phone: null,
        address: null,
      };

      const fhirPatient = factory.create(minimalPatient as Patient);

      expect(fhirPatient.resourceType).toBe('Patient');
      expect(fhirPatient.name?.[0]?.family).toBe('Doe');
    });

    it('should set gender property (not extension)', () => {
      const fhirPatient = factory.create(mockPatient);

      expect(fhirPatient.gender).toBeDefined();
      expect(fhirPatient.gender).toBe('male');
    });

    it('should map gender values correctly', () => {
      const genderTests = [
        { dbGender: Gender.MALE, expectedFhir: 'male' },
        { dbGender: Gender.FEMALE, expectedFhir: 'female' },
        { dbGender: Gender.OTHER, expectedFhir: 'other' },
      ];

      genderTests.forEach(({ dbGender, expectedFhir }) => {
        const patient = {
          ...mockPatient,
          gender: dbGender,
        };

        const fhirPatient = factory.create(patient as Patient);
        expect(fhirPatient.gender).toBe(expectedFhir);
      });
    });

    it('should preserve patient ID in FHIR resource', () => {
      const patients = [
        { ...mockPatient, id: 'p-001' },
        { ...mockPatient, id: 'p-002' },
        { ...mockPatient, id: 'p-003' },
      ];

      patients.forEach((patient) => {
        const fhirPatient = factory.create(patient as Patient);
        expect(fhirPatient.id).toBe(patient.id);
      });
    });
  });
});
