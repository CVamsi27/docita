export interface ApiHealthCheckResult {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    database: { status: string; latency?: number; error?: string };
    memory: {
      status: string;
      heapUsed: number;
      heapTotal: number;
      rss: number;
      heapUsagePercent: number;
    };
    cpu: { status: string; user: number; system: number };
  };
}
