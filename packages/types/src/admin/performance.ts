import { z } from "zod";

export const DatabaseStatsSchema = z.object({
  status: z.enum(["connected", "degraded", "unavailable"]),
  queryResponseTimeMs: z.number().int().nonnegative(),
  timestamp: z.string(),
});

export const AppPerformanceMetricsSchema = z.object({
  memory: z.object({
    rss: z.number().int(),
    heapTotal: z.number().int(),
    heapUsed: z.number().int(),
    external: z.number().int(),
  }),
  uptime: z.object({
    seconds: z.number().int().nonnegative(),
    formatted: z.string(),
  }),
  node: z.object({
    version: z.string(),
    platform: z.string(),
    arch: z.string(),
  }),
  timestamp: z.string(),
});

export const HealthCheckSchema = z.object({
  status: z.string(),
  timestamp: z.string(),
});

export type DatabaseStats = z.infer<typeof DatabaseStatsSchema>;
export type AppPerformanceMetrics = z.infer<
  typeof AppPerformanceMetricsSchema
>;
export type HealthCheck = z.infer<typeof HealthCheckSchema>;
