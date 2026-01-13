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
export class DiagnosisSuggestionListResponseDto extends createZodDto(
  z.array(aiDiagnosisSuggestionSchema),
) {}
export class MedicationRecommendationListResponseDto extends createZodDto(
  z.array(aiMedicationRecommendationSchema),
) {}
export class ExtractionResultResponseDto extends createZodDto(
  aiExtractionResultSchema,
) {}
