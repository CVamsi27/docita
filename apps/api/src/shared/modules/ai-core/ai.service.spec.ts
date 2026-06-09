import { Test, TestingModule } from '@nestjs/testing';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { AiService } from './ai.service';
import { AiFactory } from './factories/ai.factory';
import { z } from 'zod';

describe('AiService', () => {
  let service: AiService;
  let configService: AppConfigService;
  let aiFactory: AiFactory;

  const mockAppConfigService = {
    getAiConfig: jest.fn().mockReturnValue({
      apiKey: undefined,
      model: 'gpt-4o',
      requestTimeout: 5000,
      cacheEnabled: true,
      cacheTtl: 86400,
    }),
  };

  const mockAiFactory = {
    validateResponse: jest.fn(),
  };

  beforeEach(async () => {
    mockAppConfigService.getAiConfig.mockReset().mockReturnValue({
      apiKey: undefined,
      model: 'gpt-4o',
      requestTimeout: 5000,
      cacheEnabled: true,
      cacheTtl: 86400,
    });
    mockAiFactory.validateResponse.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: AppConfigService,
          useValue: mockAppConfigService,
        },
        {
          provide: AiFactory,
          useValue: mockAiFactory,
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    configService = module.get<AppConfigService>(AppConfigService);
    aiFactory = module.get<AiFactory>(AiFactory);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateText', () => {
    it('should return mock response when API key is missing', async () => {
      mockAppConfigService.getAiConfig.mockReturnValue({
        apiKey: undefined,
        model: 'gpt-4o',
        requestTimeout: 5000,
        cacheEnabled: true,
        cacheTtl: 86400,
      });
      const prompt = { user: 'Hello' };
      const result = await service.generateText(prompt);

      expect(result).toContain('[AI Generated Response');
    });

    it('should use mock response even if API key exists (for now)', async () => {
      mockAppConfigService.getAiConfig.mockReturnValue({
        apiKey: 'test-key',
        model: 'gpt-4o',
        requestTimeout: 5000,
        cacheEnabled: true,
        cacheTtl: 86400,
      });
      // Keep this unit test network-free and deterministic.
      Reflect.set(service, 'openai', null);
      const prompt = { user: 'Hello' };
      const result = await service.generateText(prompt);

      expect(result).toContain('[AI Generated Response');
    });
  });

  describe('generateStructured', () => {
    it('should attempt validation via factory', async () => {
      Reflect.set(service, 'openai', {
        chat: {
          completions: {
            create: jest
              .fn()
              .mockResolvedValue({ choices: [{ message: { content: '{}' } }] }),
          },
        },
      });
      const Schema = z.object({ foo: z.string() });

      mockAiFactory.validateResponse.mockReturnValue({ foo: 'bar' });

      const result = await service.generateStructured({ user: 'test' }, Schema);

      expect(mockAiFactory.validateResponse).toHaveBeenCalled();
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should fallback to mock schema generation if validation fails', async () => {
      mockAppConfigService.getAiConfig.mockReturnValue({
        apiKey: undefined,
        model: 'gpt-4o',
        requestTimeout: 5000,
        cacheEnabled: true,
        cacheTtl: 86400,
      });
      const Schema = z.object({ foo: z.string() });

      mockAiFactory.validateResponse.mockImplementation(() => {
        throw new Error('Validation failed');
      });

      const result = await service.generateStructured({ user: 'test' }, Schema);

      expect(result).toBeDefined();
    });
  });
});
