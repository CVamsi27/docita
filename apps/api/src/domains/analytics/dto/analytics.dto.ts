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

export class AnyResponseDto extends createZodDto(
  z.record(z.string(), z.unknown()),
) {}
