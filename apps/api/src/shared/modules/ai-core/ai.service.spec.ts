import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiFactory } from './factories/ai.factory';
import { z } from 'zod';

describe('AiService', () => {
  let service: AiService;
  let _configService: ConfigService;
  let _aiFactory: AiFactory;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockAiFactory = {
    validateResponse: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: AiFactory,
          useValue: mockAiFactory,
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    configService = module.get<ConfigService>(ConfigService);
    aiFactory = module.get<AiFactory>(AiFactory);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateText', () => {
    it('should return mock response when API key is missing', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      const prompt = { user: 'Hello' };
      const result = await service.generateText(prompt);

      expect(result).toContain('[AI Generated Response');
    });

    it('should use mock response even if API key exists (for now)', async () => {
      mockConfigService.get.mockReturnValue('test-key');
      const prompt = { user: 'Hello' };
      const result = await service.generateText(prompt);

      expect(result).toContain('[AI Generated Response');
    });
  });

  describe('generateStructured', () => {
    it('should attempt validation via factory', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      const Schema = z.object({ foo: z.string() });

      mockAiFactory.validateResponse.mockReturnValue({ foo: 'bar' });

      const result = await service.generateStructured({ user: 'test' }, Schema);

      expect(mockAiFactory.validateResponse).toHaveBeenCalled();
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should fallback to mock schema generation if validation fails', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      const Schema = z.object({ foo: z.string() });

      mockAiFactory.validateResponse.mockImplementation(() => {
        throw new Error('Validation failed');
      });

      const result = await service.generateStructured({ user: 'test' }, Schema);

      expect(result).toBeDefined();
    });
  });
});
