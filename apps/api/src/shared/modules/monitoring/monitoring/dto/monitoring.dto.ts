import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  SystemHealthSchema,
  RequestStatsSchema,
  ErrorStatsSchema,
  PerformanceMetricsSchema,
  WebVitalSchema,
  WebVitalsAggregateListSchema,
  securityMonitoringSummarySchema,
  queueHealthSummarySchema,
  jsonObjectSchema,
} from '@workspace/types';

export {
  SystemHealthSchema,
  RequestStatsSchema,
  ErrorStatsSchema,
  PerformanceMetricsSchema,
  WebVitalSchema,
  WebVitalsAggregateListSchema,
  securityMonitoringSummarySchema,
  queueHealthSummarySchema,
};

export class WebVitalDto extends createZodDto(WebVitalSchema) {}

export class SystemHealthResponseDto extends createZodDto(SystemHealthSchema) {}
export class RequestStatsResponseDto extends createZodDto(RequestStatsSchema) {}
export class ErrorStatsResponseDto extends createZodDto(ErrorStatsSchema) {}
export class PerformanceMetricsResponseDto extends createZodDto(
  PerformanceMetricsSchema,
) {}
export class WebVitalsAggregateListResponseDto extends createZodDto(
  WebVitalsAggregateListSchema,
) {}

export class SecurityMonitoringSummaryResponseDto extends createZodDto(
  securityMonitoringSummarySchema,
) {}

export class QueueHealthSummaryResponseDto extends createZodDto(
  queueHealthSummarySchema,
) {}

export const AggregatedPerformanceSchema = z.object({
  period: z.string(),
  data: z.array(z.record(z.unknown())),
});
export class AggregatedPerformanceResponseDto extends createZodDto(
  AggregatedPerformanceSchema,
) {}

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

export class AnyResponseDto extends createZodDto(jsonObjectSchema) {}
