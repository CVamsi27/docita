import { z } from 'zod';

// Schema for structure of a prompt
export const AiPromptSchema = z.object({
  system: z.string().optional(),
  user: z.string(),
  context: z.record(z.any()).optional(), // Dynamic context to inject
});

export type AiPromptInput = z.infer<typeof AiPromptSchema>;

// Schema for tracking token usage
export const AiUsageSchema = z.object({
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  model: z.string(),
});

export type AiUsage = z.infer<typeof AiUsageSchema>;

// Input schema for history summarization
export const SummarizationInputSchema = z.object({
  patientId: z.string().cuid(),
  conditions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
});

export type SummarizationInput = z.infer<typeof SummarizationInputSchema>;
