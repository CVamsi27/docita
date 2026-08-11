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
    const aiConfig = this.configService.getAiConfig();
    this.modelType = aiConfig.model;
    this.requestTimeout = aiConfig.requestTimeout;
    this.cacheEnabled = aiConfig.cacheEnabled;
    this.cacheTTL = aiConfig.cacheTtl;

    // DPDP master kill-switch: the OpenAI client is only constructed when
    // external AI is explicitly enabled AND a key is present. When disabled
    // (the default), `client` is undefined and every AI feature degrades to a
    // no-op / local path — no patient data can leave to OpenAI.
    if (!aiConfig.externalEnabled) {
      this.logger.warn(
        'External AI disabled (AI_EXTERNAL_ENABLED=false) — no OpenAI calls will be made.',
      );
    } else if (!aiConfig.apiKey) {
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
    if (!this.openai)
      throw new ServiceUnavailableException('OpenAI client not initialized');
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

  /**
   * Call the chat-completions endpoint. The return type is generic so
   * callers can assert the expected shape (`callChatCompletion<MyShape>(...)`).
   * The default of `unknown` preserves the historic contract; new
   * callers should pass the expected type and validate with Zod before
   * use, since the upstream API can return any JSON.
   */
  async callChatCompletion<T = unknown>(params: {
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
      const cached = await this.cacheManager.get(cacheKey);
      if (cached !== undefined && cached !== null) return cached;
    }

    if (!this.openai)
      throw new ServiceUnavailableException('OpenAI client not initialized');

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
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
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('OpenAI request timeout')),
          this.requestTimeout,
        );
      }),
    ]).finally(() => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    });

    const content = response.choices?.[0]?.message?.content;
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

    return result;
  }
}
