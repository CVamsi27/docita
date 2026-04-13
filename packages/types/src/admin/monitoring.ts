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
  name: z.string(),
  value: z.number(),
  rating: z.string(), 
  delta: z.number().optional(),
  id: z.string().optional(),
  navigationType: z.string().optional(),
  page: z.string().optional(),
  userId: z.string().optional(),
  sessionId: z.string().optional(),
});
