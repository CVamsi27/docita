import { z } from "zod";

export const SystemHealthSchema = z.object({
  status: z.enum(["ok", "error", "warning"]),
  uptime: z.number(),
  timestamp: z.date().or(z.string()),
  version: z.string().optional(),
  cpuUsage: z.number().optional(),
  memoryUsage: z.number().optional(),
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
