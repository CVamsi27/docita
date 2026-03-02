import { z } from 'zod';

export const AiPromptSchema = z.object({
  system: z.string().optional(),
  user: z.string(),
  context: z.record(z.unknown()).optional(),
});

export type AiPromptInput = z.infer<typeof AiPromptSchema>;

export const AiUsageSchema = z.object({
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  model: z.string(),
});

export type AiUsage = z.infer<typeof AiUsageSchema>;

export const SummarizationInputSchema = z.object({
  patientId: z.string().cuid(),
  conditions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
});

export type SummarizationInput = z.infer<typeof SummarizationInputSchema>;
