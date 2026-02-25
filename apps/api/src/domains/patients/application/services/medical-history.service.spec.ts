import { Test, TestingModule } from '@nestjs/testing';
import { MedicalHistoryService } from './medical-history.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MedicalHistoryFactory } from './factories/medical-history.factory';
import { AiService } from '../../shared/modules/ai-core/ai.service';
import { AiFactory } from '../../shared/modules/ai-core/factories/ai.factory';

describe('MedicalHistoryService', () => {
  let service: MedicalHistoryService;
  let factory: MedicalHistoryFactory;
  let aiService: AiService;
  let aiFactory: AiFactory;

  const mockPrismaService = {
    patientMedicalCondition: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    patientAllergy: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    patientFamilyHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    patientSocialHistory: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    patientSurgicalHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    prescription: {
      findMany: jest.fn(),
    },
  };

  const mockFactory = {
    createCondition: jest.fn(),
    createAllergy: jest.fn(),
    createFamilyHistory: jest.fn(),
    createSocialHistory: jest.fn(),
    createSurgicalHistory: jest.fn(),
  };

  const mockAiService = {
    generateText: jest.fn(),
  };

  const mockAiFactory = {
    createPrompt: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicalHistoryService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MedicalHistoryFactory, useValue: mockFactory },
        { provide: AiService, useValue: mockAiService },
        { provide: AiFactory, useValue: mockAiFactory },
      ],
    }).compile();

    service = module.get<MedicalHistoryService>(MedicalHistoryService);
    factory = module.get<MedicalHistoryFactory>(MedicalHistoryFactory);
    aiService = module.get<AiService>(AiService);
    aiFactory = module.get<AiFactory>(AiFactory);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCondition', () => {
    it('should call factory and prisma create', async () => {
      const input = { conditionName: 'Flu' };
      const validated = { ...input, conditionType: 'ACUTE' };
      const patientId = 'p123';

      mockFactory.createCondition.mockReturnValue(validated);

      await service.createCondition(patientId, input as any);

      expect(factory.createCondition).toHaveBeenCalledWith(input);
      expect(
        mockPrismaService.patientMedicalCondition.create,
      ).toHaveBeenCalled();
    });
  });

  describe('summarizeMedicalHistory', () => {
    it('should aggregate data and call AI service', async () => {
      const patientId = 'p123';
      mockPrismaService.patientMedicalCondition.findMany.mockResolvedValue([]);
      mockPrismaService.patientAllergy.findMany.mockResolvedValue([]);
      mockPrismaService.prescription.findMany.mockResolvedValue([]);

      const mockPrompt = { user: 'test prompt' };
      mockAiFactory.createPrompt.mockReturnValue(mockPrompt);
      mockAiService.generateText.mockResolvedValue('Summary');

      const result = await service.summarizeMedicalHistory(patientId);

      expect(result).toBe('Summary');
      expect(mockAiFactory.createPrompt).toHaveBeenCalled();
      expect(mockAiService.generateText).toHaveBeenCalledWith(mockPrompt);
    });
  });
});
