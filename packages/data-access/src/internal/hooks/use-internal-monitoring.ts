import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import {
  queueHealthSummarySchema,
  securityMonitoringSummarySchema,
  WebVitalsAggregateListSchema,
  type AppPerformanceMetrics,
  type DatabaseStats,
  type TenantScopeDiagnostics,
  tenantScopeDiagnosticsSchema,
} from "@workspace/types";
import { internalQueryKeys } from "../../lib/query-keys";
import { useDataAccessFetcher } from "../../provider/hooks";
import type {
  InternalHealthCheckResult,
  InternalMonitoringDashboard,
  InternalSystemHealth,
} from "../monitoring.types";

function rollingWindowIsoRange(hours: number): {
  startDate: string;
  endDate: string;
} {
  const end = new Date();
  const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
  return { startDate: start.toISOString(), endDate: end.toISOString() };
}

export function useInternalPerformanceMetrics(
  options?: Omit<
    UseQueryOptions<AppPerformanceMetrics, Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.performanceMetrics(),
    queryFn: () => fetcher<AppPerformanceMetrics>("/performance/metrics"),
    ...options,
  });
}

export function useInternalPerformanceDatabaseStats(
  options?: Omit<
    UseQueryOptions<DatabaseStats, Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.performanceDatabase(),
    queryFn: () => fetcher<DatabaseStats>("/performance/db-stats"),
    ...options,
  });
}

export function useInternalMonitoringHealth(
  options?: Omit<
    UseQueryOptions<InternalSystemHealth, Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.monitoringHealth(),
    queryFn: () => fetcher<InternalSystemHealth>("/monitoring/health"),
    ...options,
  });
}

export function useInternalHealthCheck(
  scope: "performance" | "system-monitoring",
  options?: Omit<
    UseQueryOptions<InternalHealthCheckResult, Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();
  const queryKey =
    scope === "performance"
      ? internalQueryKeys.internal.healthPerformance()
      : internalQueryKeys.internal.healthSystemMonitoring();

  return useQuery({
    queryKey,
    queryFn: () => fetcher<InternalHealthCheckResult>("/health"),
    ...options,
  });
}

export function useInternalMonitoringDashboard(
  options?: Omit<
    UseQueryOptions<InternalMonitoringDashboard, Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.monitoringDashboard(),
    queryFn: () => fetcher<InternalMonitoringDashboard>("/monitoring/dashboard"),
    ...options,
  });
}

export function useInternalTenantScopeDiagnostics(
  options?: Omit<
    UseQueryOptions<TenantScopeDiagnostics, Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.tenantScopeDiagnostics(),
    queryFn: async () =>
      tenantScopeDiagnosticsSchema.parse(
        await fetcher("/operations/database/tenant-scope"),
      ),
    ...options,
  });
}

export function useInternalMonitoringWebVitals(
  windowHours = 24,
  options?: Omit<
    UseQueryOptions<
      ReturnType<typeof WebVitalsAggregateListSchema.parse>,
      Error
    >,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();
  const windowLabel = `${windowHours}h`;

  return useQuery({
    queryKey: internalQueryKeys.internal.monitoringWebVitals(
      windowLabel,
      "rolling",
    ),
    queryFn: async () => {
      const { startDate, endDate } = rollingWindowIsoRange(windowHours);
      return WebVitalsAggregateListSchema.parse(
        await fetcher("/monitoring/web-vitals", {
          params: { startDate, endDate },
        }),
      );
    },
    ...options,
  });
}

export function useInternalMonitoringSecuritySummary(
  windowHours = 24,
  options?: Omit<
    UseQueryOptions<
      ReturnType<typeof securityMonitoringSummarySchema.parse>,
      Error
    >,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();
  const windowLabel = `${windowHours}h`;

  return useQuery({
    queryKey: internalQueryKeys.internal.monitoringSecuritySummary(
      windowLabel,
      "rolling",
    ),
    queryFn: async () => {
      const { startDate, endDate } = rollingWindowIsoRange(windowHours);
      return securityMonitoringSummarySchema.parse(
        await fetcher("/monitoring/security-summary", {
          params: { startDate, endDate },
        }),
      );
    },
    ...options,
  });
}

export function useInternalMonitoringQueueHealth(
  options?: Omit<
    UseQueryOptions<
      ReturnType<typeof queueHealthSummarySchema.parse>,
      Error
    >,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.monitoringQueueHealth(),
    queryFn: async () =>
      queueHealthSummarySchema.parse(
        await fetcher("/monitoring/queue-health"),
      ),
    ...options,
  });
}
