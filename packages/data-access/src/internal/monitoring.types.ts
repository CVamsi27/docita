/** Internal portal monitoring/health API shapes (until dedicated Zod contracts exist). */

import type { ApiHealthCheckResult } from "@workspace/types";

export type InternalHealthCheckResult = ApiHealthCheckResult;

export interface InternalSystemHealth {
  uptime: number;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpuUsage: { user: number; system: number };
  databaseConnected: boolean;
  lastErrors: number;
  avgResponseTime: number;
  requestsLastHour: number;
  errorsLastHour: number;
}

export interface InternalRequestStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  avgResponseTime: number;
  requestsByPath: { path: string; count: number; avgDuration: number }[];
  requestsByStatus: { statusCode: number; count: number }[];
  requestsByHour: { hour: number; count: number }[];
}

export interface InternalErrorStats {
  totalErrors: number;
  unresolvedErrors: number;
  errorsBySeverity: { severity: string; count: number }[];
  errorsByType: { type: string; count: number }[];
  recentErrors: {
    id: string;
    type: string;
    message: string;
    path?: string;
    severity: string;
    createdAt: string;
  }[];
  errorTrend: { date: string; count: number }[];
}

export interface InternalMonitoringPerformanceMetrics {
  slowestEndpoints: {
    path: string;
    method: string;
    avgDuration: number;
    maxDuration: number;
    count: number;
  }[];
  responseTimeDistribution: { range: string; count: number }[];
  throughputByMinute: { minute: string; count: number }[];
}

export interface InternalMonitoringDashboard {
  health: InternalSystemHealth;
  last24Hours: {
    requests: InternalRequestStats;
    errors: InternalErrorStats;
  };
  last7Days: {
    performance: InternalMonitoringPerformanceMetrics;
  };
}
