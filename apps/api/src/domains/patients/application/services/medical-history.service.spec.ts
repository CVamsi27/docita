import { Test, TestingModule } from '@nestjs/testing';
import { MedicalHistoryService } from './medical-history.service';
import { MedicalHistoryConditionsService } from './medical-history-conditions.service';
import {
  PATIENT_PERSISTENCE_PORT,
  type PatientPersistencePort,
} from '@/domains/patients/application/ports/patient-persistence.port';
import { MedicalHistoryFactory } from '@/domains/patients/core/factories/medical-history.factory';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('MedicalHistoryService', () => {
  let service: MedicalHistoryService;
  let factory: MedicalHistoryFactory;

  async function runPatientTransaction(
    callback: (tx: PatientPersistencePort) => unknown,
  ) {
    return callback(
      mockPatientPersistencePort as unknown as PatientPersistencePort,
    );
  }

  const mockPatientPersistencePort = {
    $transaction: jest.fn(runPatientTransaction),
    patientMedicalCondition: {
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      delete: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    patientAllergy: {
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      delete: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    patientFamilyHistory: {
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      delete: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    patientSocialHistory: {
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      updateMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      deleteMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    patientSurgicalHistory: {
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      delete: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
  };

  const mockFactory = {
    createCondition: jest.fn<(...args: unknown[]) => unknown>(),
    createAllergy: jest.fn<(...args: unknown[]) => unknown>(),
    createFamilyHistory: jest.fn<(...args: unknown[]) => unknown>(),
    createSocialHistory: jest.fn<(...args: unknown[]) => unknown>(),
    createSurgicalHistory: jest.fn<(...args: unknown[]) => unknown>(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalHistoryService,
        MedicalHistoryConditionsService,
        {
          provide: PATIENT_PERSISTENCE_PORT,
          useValue: mockPatientPersistencePort,
        },
        { provide: MedicalHistoryFactory, useValue: mockFactory },
      ],
    }).compile();

    service = module.get<MedicalHistoryService>(MedicalHistoryService);
    factory = module.get<MedicalHistoryFactory>(MedicalHistoryFactory);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCondition', () => {
    it('should call factory and prisma create', async () => {
      const input: Parameters<MedicalHistoryService['createCondition']>[1] = {
        conditionName: 'Flu',
        conditionType: 'ACUTE',
        status: 'ACTIVE',
        notes: 'Acute viral infection',
        diagnosedBy: 'Dr. Smith',
        sourceType: 'MANUAL',
      };
      const validated = { ...input, severity: 'MILD' };
      const patientId = 'p123';

      mockFactory.createCondition.mockReturnValue(validated);

      await service.createCondition(patientId, input);

      expect(factory.createCondition).toHaveBeenCalledWith({
        ...input,
        patientId,
      });
      expect(
        mockPatientPersistencePort.patientMedicalCondition.create,
      ).toHaveBeenCalled();
    });
  });

  describe('createAllergy', () => {
    it('checks duplicates and creates inside a transaction', async () => {
      const input: Parameters<MedicalHistoryService['createAllergy']>[1] = {
        allergen: 'Penicillin',
        allergyType: 'DRUG',
        severity: 'SEVERE',
        reaction: 'Rash',
      };
      const patientId = 'p123';

      mockFactory.createAllergy.mockReturnValue(input);
      mockPatientPersistencePort.patientAllergy.findMany.mockResolvedValue([]);
      mockPatientPersistencePort.patientAllergy.create.mockResolvedValue({
        id: 'allergy_1',
      });

      await service.createAllergy(patientId, input);

      expect(mockPatientPersistencePort.$transaction).toHaveBeenCalledTimes(1);
      expect(
        mockPatientPersistencePort.patientAllergy.findMany,
      ).toHaveBeenCalledWith({
        where: { patientId },
        select: { id: true, allergen: true },
      });
      expect(
        mockPatientPersistencePort.patientAllergy.create,
      ).toHaveBeenCalled();
    });
  });

  describe('createOrUpdateSocialHistory', () => {
    const patientId = 'p-social';
    const dto = {
      smokingStatus: 'NEVER' as const,
      notes: '',
      alcoholFrequency: '',
      substanceUse: '',
      occupation: '',
      occupationalHazards: '',
      exerciseFrequency: '',
      dietaryRestrictions: '',
    };

    beforeEach(() => {
      mockFactory.createSocialHistory.mockReturnValue({
        smokingStatus: 'NEVER',
        smokingPackYears: null,
        alcoholUse: 'NONE',
        alcoholFrequency: null,
        substanceUse: null,
        occupation: null,
        occupationalHazards: null,
        exerciseFrequency: null,
        dietaryRestrictions: null,
        notes: null,
        smokingQuitDate: null,
      });
    });

    it('wraps create path in persistence $transaction', async () => {
      mockPatientPersistencePort.patientSocialHistory.findFirst.mockResolvedValue(
        null,
      );
      mockPatientPersistencePort.patientSocialHistory.create.mockResolvedValue({
        id: 'sh-new',
        patientId,
      });

      await service.createOrUpdateSocialHistory(patientId, dto);

      expect(mockPatientPersistencePort.$transaction).toHaveBeenCalled();
      expect(
        mockPatientPersistencePort.patientSocialHistory.create,
      ).toHaveBeenCalled();
    });

    it('wraps update path in persistence $transaction', async () => {
      const existing = { id: 'sh-1', patientId };
      mockPatientPersistencePort.patientSocialHistory.findFirst
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ ...existing, smokingStatus: 'FORMER' });
      mockPatientPersistencePort.patientSocialHistory.updateMany.mockResolvedValue(
        {
          count: 1,
        },
      );

      await service.createOrUpdateSocialHistory(patientId, dto);

      expect(mockPatientPersistencePort.$transaction).toHaveBeenCalled();
      expect(
        mockPatientPersistencePort.patientSocialHistory.updateMany,
      ).toHaveBeenCalled();
    });
  });

  describe('deleteSocialHistory', () => {
    it('wraps delete in persistence $transaction', async () => {
      const existing = { id: 'sh-del', patientId: 'p-del' };
      mockPatientPersistencePort.patientSocialHistory.findFirst.mockResolvedValue(
        existing,
      );
      mockPatientPersistencePort.patientSocialHistory.deleteMany.mockResolvedValue(
        {
          count: 1,
        },
      );

      const result = await service.deleteSocialHistory('p-del');

      expect(mockPatientPersistencePort.$transaction).toHaveBeenCalled();
      expect(result).toEqual(existing);
      expect(
        mockPatientPersistencePort.patientSocialHistory.deleteMany,
      ).toHaveBeenCalledWith({ where: { patientId: 'p-del' } });
    });
  });
});
