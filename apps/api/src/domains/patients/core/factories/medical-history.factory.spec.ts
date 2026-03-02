import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { MedicalHistoryFactory } from './medical-history.factory';
import { ZodError } from 'zod';

describe('MedicalHistoryFactory', () => {
  let factory: MedicalHistoryFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MedicalHistoryFactory],
    }).compile();

    factory = module.get<MedicalHistoryFactory>(MedicalHistoryFactory);
  });

  describe('createCondition', () => {
    it('should validate and return condition data with defaults', () => {
      const data = {
        patientId: 'patient-1',
        conditionName: 'Hypertension',
      };

      const result = factory.createCondition(data);

      expect(result).toEqual(
        expect.objectContaining({
          ...data,
          conditionType: 'CHRONIC',
          status: 'ACTIVE',
        }),
      );
    });

    it('should throw error for invalid data', () => {
      const data = {
        conditionName: '',
      };

      expect(() => factory.createCondition(data as never)).toThrow(ZodError);
    });
  });
});
