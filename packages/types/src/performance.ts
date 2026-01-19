import { z } from "zod";

export const DatabaseStatsSchema = z.object({
    totalConnections: z.number().int(),
    activeConnections: z.number().int(),
    idleConnections: z.number().int(),
    sizeBytes: z.number().int(),
    queryStats: z.record(z.unknown()), // Placeholder
});

export const AppPerformanceMetricsSchema = z.object({
    cpuUsage: z.number(),
    memoryUsage: z.number(),
    uptime: z.number(),
    requestCount: z.number().int(),
    responseTime: z.number(),
});

export const HealthCheckSchema = z.object({
    status: z.string(),
    timestamp: z.string(),
});
