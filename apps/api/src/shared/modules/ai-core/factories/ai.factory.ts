import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { z } from 'zod';
import {
  AiPromptInput,
  AiPromptSchema,
} from '@/shared/modules/ai-core/schemas/ai.schema';

@Injectable()
export class AiFactory {
  createPrompt(
    template: { system?: string; user: string },
    context: Record<string, unknown> = {},
  ): AiPromptInput {
    const interpolate = (text: string, ctx: Record<string, unknown>) => {
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

  validateResponse<T>(schema: z.ZodSchema<T>, rawResponse: string): T {
    try {
      const json = JSON.parse(rawResponse);

      return schema.parse(json);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new InternalServerErrorException(
          `Failed to parse AI response as JSON: ${error.message}`,
        );
      }
      throw error;
    }
  }
}
