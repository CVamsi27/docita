import { z } from "zod";

export const SystemHealthSchema = z.object({
  uptime: z.number(),
  memoryUsage: z.object({
    rss: z.number().int(),
    heapTotal: z.number().int(),
    heapUsed: z.number().int(),
    external: z.number().int(),
  }),
  cpuUsage: z.object({
    user: z.number(),
    system: z.number(),
  }),
  databaseConnected: z.boolean(),
  lastErrors: z.number().int(),
  avgResponseTime: z.number(),
  requestsLastHour: z.number().int(),
  errorsLastHour: z.number().int(),
});

export const RequestStatsSchema = z.object({
  totalRequests: z.number().int(),
  avgResponseTime: z.number(),
  errorRate: z.number(),
});

export const ErrorStatsSchema = z.object({
  totalErrors: z.number().int(),
  byType: z.record(z.number().int()),
  recentErrors: z.array(z.unknown()), 
});

export const PerformanceMetricsSchema = z.object({
  apiLatency: z.number(),
  dbLatency: z.number(),
  externalApiLatency: z.number().optional(),
});

export type SystemHealth = z.infer<typeof SystemHealthSchema>;
export type RequestStats = z.infer<typeof RequestStatsSchema>;
export type ErrorStats = z.infer<typeof ErrorStatsSchema>;
export type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;

export const WebVitalSchema = z.object({
  name: z.string().max(32),
  value: z.number(),
  rating: z.string().max(32),
  delta: z.number().optional(),
  id: z.string().max(128).optional(),
  navigationType: z.string().max(32).optional(),
  page: z.string().max(512).optional(),
  userId: z.string().max(128).optional(),
  sessionId: z.string().max(128).optional(),
  /** Discriminator for RUM source, e.g. clinician-app vs internal-admin */
  feature: z.string().max(64).optional(),
});

export const WebVitalsAggregateRowSchema = z.object({
  name: z.string(),
  count: z.number().int().nonnegative(),
  avg: z.number(),
  min: z.number(),
  max: z.number(),
  p75: z.number(),
  p95: z.number(),
  rating: z.enum(["good", "needs-improvement", "poor"]),
});

export const WebVitalsAggregateListSchema = z.array(WebVitalsAggregateRowSchema);

export type WebVitalsAggregateRow = z.infer<typeof WebVitalsAggregateRowSchema>;

export const securityMonitoringTopPathSchema = z.object({
  path: z.string(),
  method: z.string(),
  statusCode: z.number().int(),
  count: z.number().int().nonnegative(),
});

export const securityMonitoringSummarySchema = z.object({
  windowStart: z.string(),
  windowEnd: z.string(),
  totalRequests: z.number().int().nonnegative(),
  status401: z.number().int().nonnegative(),
  status403: z.number().int().nonnegative(),
  status429: z.number().int().nonnegative(),
  status5xx: z.number().int().nonnegative(),
  topAuthFailureRoutes: z.array(securityMonitoringTopPathSchema),
});

export type SecurityMonitoringSummary = z.infer<
  typeof securityMonitoringSummarySchema
>;

export const queueJobStatusSchema = z.enum([
  "WAITING",
  "ACTIVE",
  "COMPLETED",
  "FAILED",
  "DELAYED",
  "DEAD_LETTERED",
]);

export const queueHealthStatusCountSchema = z.object({
  status: queueJobStatusSchema,
  count: z.number().int().nonnegative(),
});

export const queueHealthNameCountSchema = z.object({
  name: z.string(),
  count: z.number().int().nonnegative(),
});

export const queueHealthSummarySchema = z.object({
  countsByStatus: z.array(queueHealthStatusCountSchema),
  topQueuesByWaiting: z.array(queueHealthNameCountSchema),
  topQueuesByFailed: z.array(queueHealthNameCountSchema),
  deadLetteredLast24h: z.number().int().nonnegative(),
});

export type QueueHealthSummary = z.infer<typeof queueHealthSummarySchema>;
