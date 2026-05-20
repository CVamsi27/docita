import {
  Injectable,
  Logger,
  Inject,
  Optional,
  ServiceUnavailableException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import OpenAI from 'openai';

@Injectable()
export class OpenaiService {
  private readonly logger = new Logger(OpenaiService.name);
  private openai!: OpenAI;
  private readonly modelType: string;
  private readonly requestTimeout: number;
  private readonly cacheEnabled: boolean;
  private readonly cacheTTL: number;

  constructor(
    private configService: AppConfigService,
    @Optional() @Inject(CACHE_MANAGER) private cacheManager?: Cache,
  ) {
    const aiConfig = this.configService.getOpenAiConfig();
    this.modelType = aiConfig.model;
    this.requestTimeout = aiConfig.requestTimeout;
    this.cacheEnabled = aiConfig.cacheEnabled;
    this.cacheTTL = aiConfig.cacheTtl;

    if (!aiConfig.apiKey) {
      this.logger.warn('OpenAI API key not configured.');
    } else {
      this.openai = new OpenAI({ apiKey: aiConfig.apiKey });
    }
  }

  get client() {
    return this.openai;
  }

  get config() {
    return {
      modelType: this.modelType,
      requestTimeout: this.requestTimeout,
      cacheEnabled: this.cacheEnabled,
      cacheTTL: this.cacheTTL,
    };
  }

  async *streamChatCompletion(params: {
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    temperature?: number;
    signal?: AbortSignal;
  }): AsyncGenerator<string, void, void> {
    const { systemPrompt, messages, temperature = 0.4, signal } = params;
    if (!this.openai) {
      throw new ServiceUnavailableException('OpenAI client not initialized');
    }
    const stream = await this.openai.chat.completions.create(
      {
        model: this.modelType,
        stream: true,
        temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      },
      { signal },
    );
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  async callChatCompletion<T = never>(params: {
    systemPrompt: string;
    userPrompt: string;
    temperature?: number;
    jsonMode?: boolean;
    cacheKeyPrefix?: string;
    cacheKeyData?: unknown;
  }): Promise<T> {
    const {
      systemPrompt,
      userPrompt,
      temperature = 0.3,
      jsonMode = true,
      cacheKeyPrefix,
      cacheKeyData,
    } = params;

    if (
      this.cacheEnabled &&
      this.cacheManager &&
      cacheKeyPrefix &&
      cacheKeyData
    ) {
      const cacheKey = `${cacheKeyPrefix}:${Buffer.from(JSON.stringify(cacheKeyData)).toString('base64')}`;
      const cached = await this.cacheManager.get<T>(cacheKey);
      if (cached) return cached;
    }

    if (!this.openai) {
      throw new ServiceUnavailableException('OpenAI client not initialized');
    }

    const response = await Promise.race([
      this.openai.chat.completions.create({
        model: this.modelType,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        response_format: jsonMode ? { type: 'json_object' } : undefined,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('OpenAI request timeout')),
          this.requestTimeout,
        ),
      ),
    ]);

    const content = (response as OpenAI.Chat.Completions.ChatCompletion)
      .choices?.[0]?.message?.content;
    if (!content)
      throw new InternalServerErrorException('Empty response from OpenAI');

    let result: unknown = content;
    if (jsonMode) {
      try {
        result = JSON.parse(content);
      } catch {
        throw new InternalServerErrorException(
          'Invalid JSON response from OpenAI',
        );
      }
    }

    if (
      this.cacheEnabled &&
      this.cacheManager &&
      cacheKeyPrefix &&
      cacheKeyData
    ) {
      const cacheKey = `${cacheKeyPrefix}:${Buffer.from(JSON.stringify(cacheKeyData)).toString('base64')}`;
      await this.cacheManager.set(cacheKey, result, this.cacheTTL * 1000);
    }

    return result as T;
  }
}
