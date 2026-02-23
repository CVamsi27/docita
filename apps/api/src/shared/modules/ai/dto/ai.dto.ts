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
