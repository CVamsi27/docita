import { Test, TestingModule } from '@nestjs/testing';
import { VitalsFactory } from './vitals.factory';

describe('VitalsFactory', () => {
  let factory: VitalsFactory;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VitalsFactory],
    }).compile();

    factory = module.get<VitalsFactory>(VitalsFactory);
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  it('should calculate BMI if height and weight are provided', () => {
    const data = {
      height: 180, // cm
      weight: 80, // kg
    };
    // BMI = 80 / (1.8 * 1.8) = 24.69... -> 24.7
    const result = factory.create(data);
    expect(result.bmi).toBe(24.7);
  });

  it('should not overwrite provided BMI', () => {
    const data = {
      height: 180,
      weight: 80,
      bmi: 25.0,
    };
    const result = factory.create(data);
    expect(result.bmi).toBe(25.0);
  });

  it('should pass through provided fields', () => {
    const data = {
      bloodPressure: '120/80',
      pulse: 72,
    };
    const result = factory.create(data);
    expect(result.bloodPressure).toBe('120/80');
    expect(result.pulse).toBe(72);
  });
});
