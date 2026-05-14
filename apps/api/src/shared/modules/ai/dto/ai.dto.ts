import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  aiAnalysisResultSchema,
  aiDiagnosisSuggestionSchema,
  aiMedicationRecommendationSchema,
  aiExtractionResultSchema,
  aiPrescriptionAnalysisInputSchema,
} from '@workspace/types';

export class AnalyzePrescriptionDto extends createZodDto(
  aiPrescriptionAnalysisInputSchema,
) {}

export class AIAnalysisResponseDto extends createZodDto(
  aiAnalysisResultSchema,
) {}

export const DiagnosisSuggestionRequestSchema = z.object({
  symptoms: z
    .array(z.string().min(1))
    .min(1, 'At least one symptom is required'),
  findingsNotes: z.string().optional(),
});
export class DiagnosisSuggestionRequestDto extends createZodDto(
  DiagnosisSuggestionRequestSchema,
) {}

export class DiagnosisSuggestionListResponseDto extends createZodDto(
  z.array(aiDiagnosisSuggestionSchema),
) {}

export const MedicationRecommendationRequestSchema = z.object({
  condition: z.string().min(1, 'Condition is required'),
  patientAge: z.number().int().positive().optional(),
  allergies: z.array(z.string()).optional(),
});
export class MedicationRecommendationRequestDto extends createZodDto(
  MedicationRecommendationRequestSchema,
) {}

export class MedicationRecommendationListResponseDto extends createZodDto(
  z.array(aiMedicationRecommendationSchema),
) {}
export class ExtractionResultResponseDto extends createZodDto(
  aiExtractionResultSchema,
) {}

export const AskAiMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1).max(8000),
});

export const AskAiRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(4000),
  history: z.array(AskAiMessageSchema).max(20).optional(),
  scope: z
    .object({
      id: z.string().min(1).max(200),
      label: z.string().min(1).max(200),
      payload: z.record(z.string(), z.unknown()).optional(),
    })
    .nullable()
    .optional(),
});

export class AskAiRequestDto extends createZodDto(AskAiRequestSchema) {}
