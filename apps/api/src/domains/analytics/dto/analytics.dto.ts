import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  OverviewStatsSchema,
  RevenueTrendSchema,
  PatientGrowthSchema,
  AppointmentStatsSchema,
  TopDiagnosisSchema,
  DiseaseTrendSchema,
} from '@workspace/types';

export class OverviewStatsResponseDto extends createZodDto(
  OverviewStatsSchema,
) {}
export class RevenueTrendListResponseDto extends createZodDto(
  z.array(RevenueTrendSchema),
) {}
export class PatientGrowthListResponseDto extends createZodDto(
  z.array(PatientGrowthSchema),
) {}
export class AppointmentStatsResponseDto extends createZodDto(
  AppointmentStatsSchema,
) {}
export class TopDiagnosisListResponseDto extends createZodDto(
  z.array(TopDiagnosisSchema),
) {}
export class DiseaseTrendListResponseDto extends createZodDto(
  z.array(DiseaseTrendSchema),
) {}

// Additional DTOs for other endpoints can be added here or inferred as 'z.any()' if complex
// For now, we prioritize the ones we defined schemas for.
// Using z.any() wrapper for unmodelled responses until we can fully type them.
export class AnyResponseDto extends createZodDto(z.any()) {}
