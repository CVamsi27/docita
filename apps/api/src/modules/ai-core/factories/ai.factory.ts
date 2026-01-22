import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { AiPromptInput, AiPromptSchema } from '../schemas/ai.schema';

@Injectable()
export class AiFactory {
  /**
   * Creates a structured prompt object, merging context into templates if needed.
   * Simple interpolation for now: {{key}} in text replaced by context[key].
   */
  createPrompt(
    template: { system?: string; user: string },
    context: Record<string, any> = {},
  ): AiPromptInput {
    const interpolate = (text: string, ctx: Record<string, any>) => {
      return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        return ctx[key] !== undefined ? String(ctx[key]) : `{{${key}}}`;
      });
    };

    const system = template.system
      ? interpolate(template.system, context)
      : undefined;
    const user = interpolate(template.user, context);

    const promptData: AiPromptInput = {
      system,
      user,
      context,
    };

    return AiPromptSchema.parse(promptData);
  }

  /**
   * Validates a raw JSON response (string) against a Zod schema.
   * Useful for Structured Outputs mode.
   */
  validateResponse<T>(schema: z.ZodSchema<T>, rawResponse: string): T {
    try {
      // First try to parse the string as JSON
      const json = JSON.parse(rawResponse);
      // Then validate against schema
      return schema.parse(json);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(
          `Failed to parse AI response as JSON: ${error.message}`,
        );
      }
      throw error;
    }
  }
}
