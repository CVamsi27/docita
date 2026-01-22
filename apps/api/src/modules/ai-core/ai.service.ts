import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiFactory } from './factories/ai.factory';
import { AiPromptInput } from './schemas/ai.schema';
import { z } from 'zod';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private configService: ConfigService,
    private aiFactory: AiFactory,
  ) {}

  /**
   * Generates text based on a prompt.
   * Currently mocked to generic response or "echo" until provider key is active.
   */
  async generateText(prompt: AiPromptInput): Promise<string> {
    const apiKey = this.configService.get<string>('AI_API_KEY');

    if (!apiKey) {
      this.logger.warn('AI_API_KEY not found. Using mock response.');
      return Promise.resolve(this.mockGenerateText(prompt));
    }

    // TODO: Integrate actual provider (OpenAI, Anthropic, etc.)
    return Promise.resolve(this.mockGenerateText(prompt));
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
      return this.aiFactory.validateResponse(schema, responseText);
    } catch (e) {
      // If validation fails (expected with mock text), try to perform a mock schema generation
      // This is purely for testing the flow without a real LLM
      this.logger.warn(
        'Response validation failed (expected with mock). Generating mock data from schema.',
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
