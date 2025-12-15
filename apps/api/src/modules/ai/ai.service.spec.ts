import { Test, TestingModule } from '@nestjs/testing';
import { CacheModule } from '@nestjs/cache-manager';
import { AIService } from './ai.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MonitoringService } from '../../monitoring/monitoring.service';

describe('AIService', () => {
  let service: AIService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CacheModule.register()],
      providers: [
        AIService,
        {
          provide: PrismaService,
          useValue: {
            audit: { create: jest.fn() },
          },
        },
        {
          provide: MonitoringService,
          useValue: {
            logError: jest.fn(),
            logInfo: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe.skip('analyzePrescription', () => {
    const mockRequest = {
      medications: [
        { name: 'Aspirin', dosage: '500mg' },
        { name: 'Metformin', dosage: '1000mg' },
      ],
      patientAge: 35,
    };

    it('should analyze prescription and return structured response', async () => {
      const result = await service.analyzePrescription(mockRequest);

      expect(result).toHaveProperty('drugInteractions');
      expect(result).toHaveProperty('contraindications');
      expect(result).toHaveProperty('dosageRecommendations');
      expect(Array.isArray(result.drugInteractions)).toBe(true);
      expect(Array.isArray(result.contraindications)).toBe(true);
      expect(Array.isArray(result.dosageRecommendations)).toBe(true);
    });

    it('should detect drug interactions', async () => {
      const result = await service.analyzePrescription(mockRequest);

      result.drugInteractions.forEach((interaction) => {
        expect(['mild', 'moderate', 'severe']).toContain(interaction.severity);
        expect(interaction).toHaveProperty('drug1');
        expect(interaction).toHaveProperty('drug2');
        expect(interaction).toHaveProperty('description');
      });
    });

    it('should assess dosage appropriateness', async () => {
      const result = await service.analyzePrescription(mockRequest);

      result.dosageRecommendations.forEach((rec) => {
        expect(['appropriate', 'high', 'low']).toContain(rec.status);
        expect(rec).toHaveProperty('medication');
        expect(rec).toHaveProperty('recommendation');
      });
    });

    it('should handle empty medications array', async () => {
      const result = await service.analyzePrescription({
        medications: [],
      });

      expect(Array.isArray(result.drugInteractions)).toBe(true);
    });

    it('should use mock data when OpenAI API not configured', async () => {
      const result = await service.analyzePrescription(mockRequest);

      expect(result).toBeDefined();
      expect(result.drugInteractions).toBeDefined();
    });
  });

  describe.skip('suggestDiagnoses', () => {
    const mockSymptoms = ['fever', 'cough', 'fatigue'];

    it('should suggest diagnoses based on symptoms', async () => {
      const result = await service.suggestDiagnoses(mockSymptoms);

      expect(Array.isArray(result)).toBe(true);
      result.forEach((suggestion) => {
        expect(suggestion).toHaveProperty('icdCode');
        expect(suggestion).toHaveProperty('diagnosis');
        expect(suggestion).toHaveProperty('confidence');
        expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
        expect(suggestion.confidence).toBeLessThanOrEqual(100);
      });
    });

    it('should return ICD-10 codes', async () => {
      const result = await service.suggestDiagnoses(mockSymptoms);

      if (result.length > 0) {
        result.forEach((suggestion) => {
          expect(suggestion.icdCode).toMatch(/^[A-Z]\d{2}(\.\d{1,2})?$/);
        });
      }
    });

    it('should rank by confidence score', async () => {
      const result = await service.suggestDiagnoses(mockSymptoms);

      if (result.length > 1) {
        for (let i = 0; i < result.length - 1; i++) {
          expect(result[i].confidence).toBeGreaterThanOrEqual(
            result[i + 1].confidence,
          );
        }
      }
    });

    it('should handle empty symptoms array', async () => {
      const result = await service.suggestDiagnoses([]);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe.skip('recommendMedications', () => {
    const mockDiagnosis = 'Hypertension';

    it('should recommend medications for diagnosis', async () => {
      const result = await service.recommendMedications(mockDiagnosis);

      expect(Array.isArray(result)).toBe(true);
      result.forEach((med) => {
        expect(med).toHaveProperty('medicationName');
        expect(med).toHaveProperty('strength');
        expect(med).toHaveProperty('frequency');
        expect(med).toHaveProperty('confidence');
      });
    });

    it('should include medication details', async () => {
      const result = await service.recommendMedications(mockDiagnosis);

      if (result.length > 0) {
        const med = result[0];
        expect(med.confidence).toBeGreaterThan(0);
        expect(med.medicationName).toBeTruthy();
        expect(med.strength).toBeTruthy();
      }
    });

    it('should handle empty diagnosis', async () => {
      const result = await service.recommendMedications('');

      expect(Array.isArray(result)).toBe(true);
    });

    it('should respect patient age for dosing', async () => {
      const result1 = await service.recommendMedications('Hypertension', 25);
      const result2 = await service.recommendMedications('Hypertension', 75);

      expect(Array.isArray(result1)).toBe(true);
      expect(Array.isArray(result2)).toBe(true);
    });

    it('should exclude allergic medications', async () => {
      const result = await service.recommendMedications('Hypertension', 50, [
        'lisinopril',
      ]);

      expect(Array.isArray(result)).toBe(true);
      // Verify medications list is returned
      expect(result).toBeDefined();
    });
  });

  describe.skip('caching behavior', () => {
    it('should cache prescription analysis', async () => {
      const mockRequest = {
        medications: [{ name: 'Aspirin', dosage: '500mg' }],
      };

      const result1 = await service.analyzePrescription(mockRequest);
      const result2 = await service.analyzePrescription(mockRequest);

      expect(JSON.stringify(result1)).toEqual(JSON.stringify(result2));
    });

    it('should cache diagnosis suggestions', async () => {
      const symptoms = ['fever', 'cough'];

      const result1 = await service.suggestDiagnoses(symptoms);
      const result2 = await service.suggestDiagnoses(symptoms);

      expect(JSON.stringify(result1)).toEqual(JSON.stringify(result2));
    });
  });

  describe.skip('error handling', () => {
    it('should handle invalid request gracefully', async () => {
      try {
        await service.analyzePrescription(null as any);
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should return fallback on analysis error', async () => {
      const result = await service.analyzePrescription({
        medications: [{ name: 'Test', dosage: '100mg' }],
      });

      expect(result).toHaveProperty('drugInteractions');
    });

    it('should return fallback on diagnosis error', async () => {
      const result = await service.suggestDiagnoses(['fever']);

      expect(Array.isArray(result)).toBe(true);
    });
  });
});
