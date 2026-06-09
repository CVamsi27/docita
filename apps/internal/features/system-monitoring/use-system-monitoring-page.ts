// check-as-cast-density: allow-file — narrowing casts required by generic signatures or external types
"use client";

import {
  useInternalHealthCheck,
  useInternalMonitoringDashboard,
  useInternalMonitoringHealth,
  useInternalMonitoringQueueHealth,
  useInternalMonitoringSecuritySummary,
  useInternalMonitoringWebVitals,
  useInternalPerformanceDatabaseStats,
  useInternalPerformanceMetrics,
  useInternalTenantScopeDiagnostics,
} from "@workspace/data-access/internal";
import { useMemo, useState } from "react";
import {
  buildHealthSummary,
  computeErrorRate,
  computeHeapUsagePercent,
  computeMaxThroughputCount,
  computeTenantScopeIssueCount,
  computeTenantScopeStatus,
  getStatusBadge,
  getStatusIcon,
} from "./system-monitoring-helpers";

export function useSystemMonitoringPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const fastInterval = autoRefresh ? 30000 : false;
  const slowInterval = autoRefresh ? 60000 : false;
  const dashboardQuery = useInternalMonitoringDashboard({ refetchInterval: fastInterval });
  const monitoringHealthQuery = useInternalMonitoringHealth({ refetchInterval: fastInterval });
  const appHealthQuery = useInternalHealthCheck("system-monitoring", { refetchInterval: fastInterval });
  const performanceQuery = useInternalPerformanceMetrics({ refetchInterval: fastInterval });
  const databaseQuery = useInternalPerformanceDatabaseStats({ refetchInterval: fastInterval });
  const tenantScopeQuery = useInternalTenantScopeDiagnostics({ refetchInterval: fastInterval });
  const webVitalsQuery = useInternalMonitoringWebVitals(24, { refetchInterval: slowInterval });
  const securitySummaryQuery = useInternalMonitoringSecuritySummary(24, { refetchInterval: slowInterval });
  const queueHealthQuery = useInternalMonitoringQueueHealth({ refetchInterval: fastInterval });

  const loading = dashboardQuery.isLoading || monitoringHealthQuery.isLoading || appHealthQuery.isLoading || performanceQuery.isLoading || databaseQuery.isLoading || tenantScopeQuery.isLoading;
  const dashboard = dashboardQuery.data;
  const monitoringHealth = monitoringHealthQuery.data;
  const appHealth = appHealthQuery.data;
  const performance = performanceQuery.data;
  const database = databaseQuery.data;
  const tenantScope = tenantScopeQuery.data;
  const detailedChecks = appHealth?.checks as Record<string, { status: string; latency?: number; error?: string }> | undefined;

  const liveResponseTime = monitoringHealth?.avgResponseTime ?? 0;
  const requestsLastHour = monitoringHealth?.requestsLastHour ?? 0;
  const errorsLastHour = monitoringHealth?.errorsLastHour ?? 0;
  const errorRate = computeErrorRate(requestsLastHour, errorsLastHour);
  const heapUsagePercent = performance ? computeHeapUsagePercent(performance.memory.heapUsed, performance.memory.heapTotal) : 0;
  const responseBuckets = dashboard?.last7Days.performance.responseTimeDistribution ?? [];
  const slowestEndpoints = dashboard?.last7Days.performance.slowestEndpoints ?? [];
  const tenantScopeIssueCount = computeTenantScopeIssueCount(tenantScope?.uncoveredClinicIdModels.length ?? 0, tenantScope?.staleRelationRules.length ?? 0);
  const tenantScopeStatus = computeTenantScopeStatus(tenantScopeQuery.isError, !!tenantScope, tenantScopeIssueCount);
  const throughputByMinute = useMemo(() => dashboard?.last7Days.performance.throughputByMinute ?? [], [dashboard]);
  const maxThroughputCount = useMemo(() => computeMaxThroughputCount(throughputByMinute), [throughputByMinute]);
  const healthSummary = useMemo(
    () => buildHealthSummary(monitoringHealth, requestsLastHour, errorsLastHour, errorRate, liveResponseTime),
    [errorRate, errorsLastHour, liveResponseTime, monitoringHealth, requestsLastHour],
  );

  const handleRefresh = () => {
    setRefreshing(true);
    Promise.all([
      dashboardQuery.refetch(), monitoringHealthQuery.refetch(), appHealthQuery.refetch(),
      performanceQuery.refetch(), databaseQuery.refetch(), tenantScopeQuery.refetch(),
      webVitalsQuery.refetch(), securitySummaryQuery.refetch(), queueHealthQuery.refetch(),
    ]).finally(() => setRefreshing(false));
  };

  return {
    refreshing, autoRefresh, setAutoRefresh, handleRefresh,
    loading, dashboard, monitoringHealth, appHealth, performance,
    database, tenantScope, detailedChecks, liveResponseTime,
    requestsLastHour, errorsLastHour, errorRate, heapUsagePercent,
    responseBuckets, slowestEndpoints, tenantScopeIssueCount, tenantScopeStatus,
    throughputByMinute, maxThroughputCount, getStatusIcon, getStatusBadge,
    healthSummary, webVitalsQuery, securitySummaryQuery, queueHealthQuery, tenantScopeQuery,
  };
}

export type SystemMonitoringPageViewModel = ReturnType<typeof useSystemMonitoringPage>;
