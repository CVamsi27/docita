import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { AiFactory } from './factories/ai.factory';
import { AiPromptInput } from './schemas/ai.schema';
import { z } from 'zod';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI | null = null;

  constructor(
    private configService: AppConfigService,
    private aiFactory: AiFactory,
  ) {
    const apiKey = this.configService.getOpenAiConfig().apiKey;
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
      });
    } else {
      this.logger.warn(
        'OPENAI_API_KEY not found. AI features will mimic responses.',
      );
    }
  }

  async generateText(prompt: AiPromptInput): Promise<string> {
    if (!this.openai) return Promise.resolve(this.mockGenerateText(prompt));

    try {
      const completion = await this.openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: prompt.system || 'You are a helpful medical assistant.',
          },
          { role: 'user', content: prompt.user },
        ],
        model: 'gpt-4o',
      });

      return completion.choices[0].message.content || '';
    } catch (error) {
      this.logger.error('OpenAI API call failed', error);

      return this.mockGenerateText(prompt);
    }
  }

  async generateStructured<T>(
    prompt: AiPromptInput,
    schema: z.ZodSchema<T>,
  ): Promise<T> {
    const responseText = await this.generateText(prompt);

    try {
      if (!this.openai && responseText.includes('[AI Generated Response')) {
        return this.mockSchemaGeneration(schema);
      }

      return this.aiFactory.validateResponse(schema, responseText);
    } catch (_e) {
      this.logger.warn(
        'Response validation failed. Generating mock data from schema fallback.',
      );
      return this.mockSchemaGeneration(schema);
    }
  }

  private mockGenerateText(prompt: AiPromptInput): string {
    return `[AI Generated Response to: "${prompt.user}"]\n\nBased on the context provided, here is a summary...`;
  }

  private mockSchemaGeneration<T>(schema: z.ZodSchema<T>): T {
    return schema.parse(this.buildMockValue(schema));
  }

  private isZodType(schema: unknown): schema is z.ZodTypeAny {
    return typeof schema === 'object' && schema !== null && '_def' in schema;
  }

  private buildMockValue(schema: z.ZodTypeAny): unknown {
    if (schema instanceof z.ZodObject) {
      return Object.fromEntries(
        Object.entries(schema.shape).map(([key, valueSchema]) => [
          key,
          this.isZodType(valueSchema) ? this.buildMockValue(valueSchema) : {},
        ]),
      );
    }

    if (schema instanceof z.ZodString) return '';
    if (schema instanceof z.ZodNumber) return 0;
    if (schema instanceof z.ZodBoolean) return false;
    if (schema instanceof z.ZodArray) return [];
    if (schema instanceof z.ZodNullable) return null;
    if (schema instanceof z.ZodOptional) return undefined;

    return {};
  }
}
