import { Test, TestingModule } from '@nestjs/testing';
import { MedicalHistoryService } from './medical-history.service';
import { PrismaService } from '@/prisma/prisma.service';
import { MedicalHistoryFactory } from '@/domains/patients/core/factories/medical-history.factory';
import { AiService } from '@/shared/modules/ai-core/ai.service';
import { AiFactory } from '@/shared/modules/ai-core/factories/ai.factory';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('MedicalHistoryService', () => {
  let service: MedicalHistoryService;
  let factory: MedicalHistoryFactory;
  let aiService: AiService;
  let aiFactory: AiFactory;

  const mockPrismaService = {
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
      upsert: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      delete: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    patientSurgicalHistory: {
      create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      update: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      delete: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
    prescription: {
      findMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    },
  };

  const mockFactory = {
    createCondition: jest.fn<(...args: unknown[]) => unknown>(),
    createAllergy: jest.fn<(...args: unknown[]) => unknown>(),
    createFamilyHistory: jest.fn<(...args: unknown[]) => unknown>(),
    createSocialHistory: jest.fn<(...args: unknown[]) => unknown>(),
    createSurgicalHistory: jest.fn<(...args: unknown[]) => unknown>(),
  };

  const mockAiService = {
    generateText: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
  };

  const mockAiFactory = {
    createPrompt: jest.fn<(...args: unknown[]) => unknown>(),
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

      await service.createCondition(patientId, input as never);

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
