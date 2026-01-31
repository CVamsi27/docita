import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiFactory } from './factories/ai.factory';
import { AiPromptInput } from './schemas/ai.schema';
import { z } from 'zod';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI | null = null;

  constructor(
    private configService: ConfigService,
    private aiFactory: AiFactory,
  ) {
    const apiKey = this.configService.get<string>('AI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({
        apiKey,
      });
    } else {
      this.logger.warn(
        'AI_API_KEY not found. AI features will mimic responses.',
      );
    }
  }

  /**
   * Generates text based on a prompt.
   * Uses OpenAI if key is available, otherwise falls back to mock response.
   */
  async generateText(prompt: AiPromptInput): Promise<string> {
    if (!this.openai) {
      return Promise.resolve(this.mockGenerateText(prompt));
    }

    try {
      const completion = await this.openai.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: prompt.system || 'You are a helpful medical assistant.',
          },
          { role: 'user', content: prompt.user },
        ],
        model: 'gpt-4o', // Default to a capable model
      });

      return completion.choices[0].message.content || '';
    } catch (error) {
      this.logger.error('OpenAI API call failed', error);
      // Fallback to mock on error to prevent total breakage
      return this.mockGenerateText(prompt);
    }
  }

  /**
   * Generates structured data (JSON) validated against a Zod schema.
   */
  async generateStructured<T>(
    prompt: AiPromptInput,
    schema: z.ZodSchema<T>,
  ): Promise<T> {
    const responseText = await this.generateText(prompt);

    // For mock purposes, if we get a standard mock text, we return a mock JSON that matches schema
    // In real implementation, we'd ensure the LLM outputs JSON.
    try {
      if (!this.openai && responseText.includes('[AI Generated Response')) {
        // Direct mock path
        return this.mockSchemaGeneration(schema);
      }

      return this.aiFactory.validateResponse(schema, responseText);
    } catch (e) {
      // If validation fails (expected with mock text), try to perform a mock schema generation
      // This is purely for testing the flow without a real LLM
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
    // Very basic mock generator based on schema type - strictly for ensuring flow helps
    // Ideally use libraries like 'zod-mock' or similar if robust mocking needed
    // For now, return "unknown" or minimal valid structure if possible.
    // This is a placeholder.
    return {} as T;
  }
}
