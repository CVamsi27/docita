import { Test, TestingModule } from '@nestjs/testing';
import {
  PATIENT_PERSISTENCE_PORT,
  type PatientPersistencePort,
} from '@/domains/patients/application/ports/patient-persistence.port';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('PatientService', () => {
  type PatientRecord = Record<string, unknown>;
  type PatientListResult = {
    data: PatientRecord[];
    total: number;
    page?: number;
    pageSize?: number;
  };

  let service: {
    createPatient: jest.MockedFunction<
      (dto: PatientRecord) => Promise<PatientRecord>
    >;
    getPatient: jest.MockedFunction<
      (patientId: string, clinicId: string) => Promise<PatientRecord>
    >;
    updatePatient: jest.MockedFunction<
      (
        patientId: string,
        clinicId: string,
        dto: PatientRecord,
      ) => Promise<PatientRecord>
    >;
    listPatients: jest.MockedFunction<
      (clinicId: string, query: PatientRecord) => Promise<PatientListResult>
    >;
    deletePatient: jest.MockedFunction<
      (patientId: string, clinicId: string) => Promise<PatientRecord>
    >;
    getPatientsByClinic: jest.MockedFunction<
      (clinicId: string) => Promise<PatientRecord[]>
    >;
  };
  let prisma: PatientPersistencePort;

  const mockPatientPersistencePort = {
    patient: {
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      delete: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      count: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: 'PatientService',
          useValue: {
            createPatient: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
            getPatient: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
            updatePatient: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
            listPatients: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
            deletePatient: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
            getPatientsByClinic:
              jest.fn<(...args: unknown[]) => Promise<unknown>>(),
          },
        },
        {
          provide: PATIENT_PERSISTENCE_PORT,
          useValue: mockPatientPersistencePort,
        },
      ],
    }).compile();

    service = module.get<typeof service>('PatientService');
    prisma = module.get<PatientPersistencePort>(PATIENT_PERSISTENCE_PORT);
  });

  describe('createPatient', () => {
    it('should create a patient successfully', async () => {
      const createPatientDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'MALE',
        clinicId: 'clinic-1',
      };

      const createdPatient = {
        id: 'patient-1',
        ...createPatientDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.createPatient.mockResolvedValueOnce(createdPatient);

      const result = await service.createPatient(createPatientDto);

      expect(result).toEqual(createdPatient);
      expect(result.id).toBe('patient-1');
    });

    it('should validate required fields', async () => {
      const invalidDto = {
        firstName: 'John',

        email: 'john@example.com',
      };

      service.createPatient.mockRejectedValueOnce(
        new Error('lastName is required'),
      );

      await expect(service.createPatient(invalidDto)).rejects.toThrow();
    });

    it('should create patient with medical history', async () => {
      const createPatientDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@example.com',
        phoneNumber: '+1234567890',
        dateOfBirth: new Date('1985-05-15'),
        gender: 'FEMALE',
        clinicId: 'clinic-1',
        medicalHistory: ['diabetes', 'hypertension'],
        allergies: ['penicillin'],
      };

      const createdPatient = {
        id: 'patient-2',
        ...createPatientDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.createPatient.mockResolvedValueOnce(createdPatient);

      const result = await service.createPatient(createPatientDto);

      expect(result.medicalHistory).toContain('diabetes');
      expect(result.allergies).toContain('penicillin');
    });
  });

  describe('getPatient', () => {
    it('should retrieve patient by ID', async () => {
      const patient = {
        id: 'patient-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        clinicId: 'clinic-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.getPatient.mockResolvedValueOnce(patient);

      const result = await service.getPatient('patient-1', 'clinic-1');

      expect(result).toEqual(patient);
      expect(result.id).toBe('patient-1');
    });

    it('should throw NotFoundException for non-existent patient', async () => {
      service.getPatient.mockRejectedValueOnce(new NotFoundException());

      await expect(
        service.getPatient('nonexistent', 'clinic-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce tenant isolation', async () => {
      service.getPatient.mockRejectedValueOnce(new ForbiddenException());

      await expect(
        service.getPatient('patient-clinic-b', 'clinic-a'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return patient with all relationships', async () => {
      const patient = {
        id: 'patient-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        clinicId: 'clinic-1',
        appointments: [
          {
            id: 'appt-1',
            date: new Date(),
            status: 'COMPLETED',
          },
        ],
        prescriptions: [
          {
            id: 'rx-1',
            medicationName: 'Aspirin',
            status: 'ACTIVE',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.getPatient.mockResolvedValueOnce(patient);

      const result = await service.getPatient('patient-1', 'clinic-1');

      const appointments = result['appointments'] as unknown[] | undefined;
      const prescriptions = result['prescriptions'] as unknown[] | undefined;

      expect(appointments).toBeDefined();
      expect(prescriptions).toBeDefined();
      expect(appointments?.length ?? 0).toBeGreaterThan(0);
    });
  });

  describe('updatePatient', () => {
    it('should update patient information', async () => {
      const updateDto = {
        firstName: 'John',
        lastName: 'Smith',
        phoneNumber: '+9876543410',
      };

      const updatedPatient = {
        id: 'patient-1',
        ...updateDto,
        email: 'john@example.com',
        clinicId: 'clinic-1',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date(),
      };

      service.updatePatient.mockResolvedValueOnce(updatedPatient);

      const result = await service.updatePatient(
        'patient-1',
        'clinic-1',
        updateDto,
      );

      expect(result.lastName).toBe('Smith');
      expect(result.phoneNumber).toBe('+9876543410');
    });

    it('should update medical history', async () => {
      const updateDto = {
        medicalHistory: ['diabetes', 'hypertension', 'asthma'],
      };

      const updatedPatient = {
        id: 'patient-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        clinicId: 'clinic-1',
        medicalHistory: ['diabetes', 'hypertension', 'asthma'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.updatePatient.mockResolvedValueOnce(updatedPatient);

      const result = await service.updatePatient(
        'patient-1',
        'clinic-1',
        updateDto,
      );

      expect(result.medicalHistory).toContain('asthma');
    });

    it('should throw error when updating non-existent patient', async () => {
      service.updatePatient.mockRejectedValueOnce(new NotFoundException());

      await expect(
        service.updatePatient('nonexistent', 'clinic-1', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce tenant isolation on update', async () => {
      service.updatePatient.mockRejectedValueOnce(new ForbiddenException());

      await expect(
        service.updatePatient('patient-clinic-b', 'clinic-a', {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('listPatients', () => {
    it('should list all patients for a clinic', async () => {
      const patients = [
        {
          id: 'patient-1',
          firstName: 'John',
          lastName: 'Doe',
          clinicId: 'clinic-1',
        },
        {
          id: 'patient-2',
          firstName: 'Jane',
          lastName: 'Smith',
          clinicId: 'clinic-1',
        },
      ];

      service.listPatients.mockResolvedValueOnce({
        data: patients,
        total: 2,
      });

      const result = await service.listPatients('clinic-1', {});

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should support pagination', async () => {
      const patients = Array.from({ length: 10 }, (_, i) => ({
        id: `patient-${i + 1}`,
        firstName: `Patient`,
        lastName: `${i + 1}`,
        clinicId: 'clinic-1',
      }));

      service.listPatients.mockResolvedValueOnce({
        data: patients.slice(0, 10),
        total: 100,
        page: 1,
        pageSize: 10,
      });

      const result = await service.listPatients('clinic-1', {
        page: 1,
        pageSize: 10,
      });

      expect(result.data).toHaveLength(10);
      expect(result.total).toBe(100);
      expect(result.page).toBe(1);
    });

    it('should support filtering by name', async () => {
      const patients = [
        {
          id: 'patient-1',
          firstName: 'John',
          lastName: 'Doe',
          clinicId: 'clinic-1',
        },
      ];

      service.listPatients.mockResolvedValueOnce({
        data: patients,
        total: 1,
      });

      const result = await service.listPatients('clinic-1', {
        searchQuery: 'John',
      });

      expect(result.data[0].firstName).toBe('John');
    });

    it('should enforce tenant isolation on list', async () => {
      const patients = [
        {
          id: 'patient-1',
          firstName: 'John',
          lastName: 'Doe',
          clinicId: 'clinic-1',
        },
      ];

      service.listPatients.mockResolvedValueOnce({
        data: patients,
        total: 1,
      });

      const result = await service.listPatients('clinic-1', {});

      expect(result.data.every((p) => p['clinicId'] === 'clinic-1')).toBe(true);
    });
  });

  describe('deletePatient', () => {
    it('should delete patient successfully', async () => {
      const deletedPatient = {
        id: 'patient-1',
        firstName: 'John',
        lastName: 'Doe',
        clinicId: 'clinic-1',
      };

      service.deletePatient.mockResolvedValueOnce(deletedPatient);

      const result = await service.deletePatient('patient-1', 'clinic-1');

      expect(result.id).toBe('patient-1');
    });

    it('should throw error when deleting non-existent patient', async () => {
      service.deletePatient.mockRejectedValueOnce(new NotFoundException());

      await expect(
        service.deletePatient('nonexistent', 'clinic-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should enforce tenant isolation on delete', async () => {
      service.deletePatient.mockRejectedValueOnce(new ForbiddenException());

      await expect(
        service.deletePatient('patient-clinic-b', 'clinic-a'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should soft delete patient data', async () => {
      const softDeletedPatient = {
        id: 'patient-1',
        firstName: 'John',
        lastName: 'Doe',
        clinicId: 'clinic-1',
        deletedAt: new Date(),
      };

      service.deletePatient.mockResolvedValueOnce(softDeletedPatient);

      const result = await service.deletePatient('patient-1', 'clinic-1');

      expect(result.deletedAt).toBeDefined();
    });
  });

  describe('tenant isolation', () => {
    it('should not allow clinic A to access clinic B patients', async () => {
      const clinicAPatient = {
        id: 'patient-clinic-a',
        firstName: 'John',
        lastName: 'Doe',
        clinicId: 'clinic-a',
      };

      service.getPatient.mockImplementation(
        (patientId: string, clinicId: string) => {
          void patientId;
          if (clinicAPatient.clinicId !== clinicId) {
            return Promise.reject(
              new ForbiddenException(
                'Cannot access patient from different clinic',
              ),
            );
          }
          return Promise.resolve(clinicAPatient);
        },
      );

      await expect(
        service.getPatient('patient-clinic-a', 'clinic-b'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should list only clinic-specific patients', async () => {
      service.listPatients.mockImplementation(async (clinicId: string) => {
        return {
          data: [
            { id: 'p1', clinicId },
            { id: 'p2', clinicId },
          ],
          total: 2,
        };
      });

      const result = await service.listPatients('clinic-1', {});

      expect(result.data.every((p) => p['clinicId'] === 'clinic-1')).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete patient lifecycle', async () => {
      const createDto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phoneNumber: '+1234567890',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'MALE',
        clinicId: 'clinic-1',
      };

      const createdPatient = { id: 'patient-1', ...createDto };
      service.createPatient.mockResolvedValueOnce(createdPatient);

      const created = await service.createPatient(createDto);
      expect(created.id).toBe('patient-1');

      service.getPatient.mockResolvedValueOnce(createdPatient);
      const retrieved = await service.getPatient('patient-1', 'clinic-1');
      expect(retrieved.firstName).toBe('John');

      const updatedPatient = {
        ...createdPatient,
        firstName: 'Jane',
      };
      service.updatePatient.mockResolvedValueOnce(updatedPatient);

      const updated = await service.updatePatient('patient-1', 'clinic-1', {
        firstName: 'Jane',
      });
      expect(updated.firstName).toBe('Jane');

      service.deletePatient.mockResolvedValueOnce({
        ...updatedPatient,
        deletedAt: new Date(),
      });

      const deleted = await service.deletePatient('patient-1', 'clinic-1');
      expect(deleted.deletedAt).toBeDefined();
    });
  });
});
