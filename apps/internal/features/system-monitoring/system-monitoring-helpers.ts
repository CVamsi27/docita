import { resolveInternalApiUrl } from "@/lib/api/api-config";
import { formatCountLocale } from "@workspace/utils";
import { createElement } from "react";
import {
  SystemHealthBadge,
  SystemHealthIcon,
} from "@workspace/ui/components/feedback/system-health-indicator";

export function formatBytesToMb(value: number): string {
  return `${value} MB`;
}

export function buildPrometheusMetricsUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) return null;
  try {
    const parsed = new URL(resolveInternalApiUrl(base));
    parsed.pathname = "/metrics";
    parsed.search = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

// --- Types ---

export interface HealthSummaryItem {
  label: string;
  value: string;
  status: "healthy" | "warning" | "critical";
  description: string;
}

// --- Pure helpers ---

export function computeErrorRate(requests: number, errors: number): number {
  return requests > 0
    ? Number(((errors / requests) * 100).toFixed(2))
    : 0;
}

export function computeHeapUsagePercent(
  heapUsed: number,
  heapTotal: number,
): number {
  return Math.round((heapUsed / Math.max(heapTotal, 1)) * 100);
}

export function computeTenantScopeIssueCount(
  uncoveredCount: number,
  staleCount: number,
): number {
  return uncoveredCount + staleCount;
}

export function computeTenantScopeStatus(
  isError: boolean,
  hasData: boolean,
  issueCount: number,
): "healthy" | "critical" | "warning" {
  if (isError) return "critical";
  if (!hasData) return "warning";
  return issueCount === 0 ? "healthy" : "critical";
}

export function computeMaxThroughputCount(
  items: ReadonlyArray<{ count: number }>,
): number {
  return items.reduce((max, item) => Math.max(max, item.count), 0);
}

export function getStatusIcon(status: string) {
  return createElement(SystemHealthIcon, { status });
}

export function getStatusBadge(status: string) {
  return createElement(SystemHealthBadge, { status });
}

export function buildHealthSummary(
  monitoringHealth: { databaseConnected: boolean } | null | undefined,
  requestsLastHour: number,
  errorsLastHour: number,
  errorRate: number,
  liveResponseTime: number,
): HealthSummaryItem[] | null {
  if (!monitoringHealth) return null;

  return [
    {
      label: "Database",
      value: monitoringHealth.databaseConnected ? "Connected" : "Offline",
      status: monitoringHealth.databaseConnected ? "healthy" : "critical",
      description: "Live connectivity from /monitoring/health",
    },
    {
      label: "Requests",
      value: `${formatCountLocale(requestsLastHour)} last hour`,
      status: requestsLastHour > 0 ? "healthy" : "warning",
      description: "Traffic captured by the monitoring pipeline",
    },
    {
      label: "Errors",
      value: `${formatCountLocale(errorsLastHour)} last hour`,
      status: errorsLastHour > 0 ? "warning" : "healthy",
      description: `Current error rate: ${errorRate}%`,
    },
    {
      label: "Response time",
      value: `${liveResponseTime.toFixed(2)}ms`,
      status: liveResponseTime > 1000 ? "warning" : "healthy",
      description: "Average response time over the last hour",
    },
  ] as const;
}
