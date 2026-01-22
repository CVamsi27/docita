import { Test, TestingModule } from '@nestjs/testing';
import { MedicalHistoryFactory } from './medical-history.factory';
import { ZodError } from 'zod';
import { MedicalConditionType, ConditionStatus } from '@workspace/db';

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
        conditionName: 'Hypertension',
      };

      const result = factory.createCondition(data);

      expect(result).toEqual(
        expect.objectContaining({
          ...data,
          conditionType: MedicalConditionType.CHRONIC,
          status: ConditionStatus.ACTIVE,
        }),
      );
    });

    it('should throw error for invalid data', () => {
      const data = {
        conditionName: '', // Invalid
      };

      expect(() => factory.createCondition(data as any)).toThrow(ZodError);
    });
  });

  // Add tests for other methods (Allergy, Family, Social, Surgical)
});
