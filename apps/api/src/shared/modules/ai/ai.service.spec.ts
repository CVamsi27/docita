import { Test, TestingModule } from '@nestjs/testing';
import { AIService } from './ai.service';
import { ClinicalAiService } from './clinical-ai.service';
import { OcrExtractionService } from './ocr-extraction.service';

describe('AIService', () => {
  let service: AIService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIService,
        {
          provide: ClinicalAiService,
          useValue: {
            analyzePrescription: jest.fn(),
            suggestDiagnoses: jest.fn(),
            recommendMedications: jest.fn(),
          },
        },
        {
          provide: OcrExtractionService,
          useValue: {
            extractFromMedicalDocument: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AIService>(AIService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
