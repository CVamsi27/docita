import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  SystemHealthSchema,
  RequestStatsSchema,
  ErrorStatsSchema,
  PerformanceMetricsSchema,
  WebVitalSchema,
} from '@workspace/types';

export class WebVitalDto extends createZodDto(WebVitalSchema) {}

export class SystemHealthResponseDto extends createZodDto(SystemHealthSchema) {}
export class RequestStatsResponseDto extends createZodDto(RequestStatsSchema) {}
export class ErrorStatsResponseDto extends createZodDto(ErrorStatsSchema) {}
export class PerformanceMetricsResponseDto extends createZodDto(
  PerformanceMetricsSchema,
) {}
export class WebVitalListResponseDto extends createZodDto(
  z.array(WebVitalSchema),
) {}

// For aggregated performance which might be custom:
export const AggregatedPerformanceSchema = z.object({
  period: z.string(),
  data: z.array(z.any()), // Placeholder
});
export class AggregatedPerformanceResponseDto extends createZodDto(
  AggregatedPerformanceSchema,
) {}

// For dashboard which returns a composite object
export const MonitoringDashboardSchema = z.object({
  health: SystemHealthSchema,
  last24Hours: z.object({
    requests: RequestStatsSchema,
    errors: ErrorStatsSchema,
  }),
  last7Days: z.object({
    performance: PerformanceMetricsSchema,
  }),
});
export class MonitoringDashboardResponseDto extends createZodDto(
  MonitoringDashboardSchema,
) {}

export class AnyResponseDto extends createZodDto(z.any()) {}
