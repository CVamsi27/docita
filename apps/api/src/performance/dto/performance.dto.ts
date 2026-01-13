import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  DatabaseStatsSchema,
  AppPerformanceMetricsSchema,
  HealthCheckSchema,
} from '@workspace/types';

export class DatabaseStatsResponseDto extends createZodDto(
  DatabaseStatsSchema,
) {}
export class AppPerformanceMetricsResponseDto extends createZodDto(
  AppPerformanceMetricsSchema,
) {}
export class HealthCheckResponseDto extends createZodDto(HealthCheckSchema) {}
