"use client";

import { formatCountLocale } from "@workspace/utils";
import {
  SystemHealthBadge,
  SystemHealthIcon,
} from "@workspace/ui/components/feedback/system-health-indicator";
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
import { createElement, useMemo, useState } from "react";

export function useSystemMonitoringPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const fastInterval = autoRefresh ? 30000 : false;
  const slowInterval = autoRefresh ? 60000 : false;

  const dashboardQuery = useInternalMonitoringDashboard({
    refetchInterval: fastInterval,
  });

  const monitoringHealthQuery = useInternalMonitoringHealth({
    refetchInterval: fastInterval,
  });

  const appHealthQuery = useInternalHealthCheck("system-monitoring", {
    refetchInterval: fastInterval,
  });

  const performanceQuery = useInternalPerformanceMetrics({
    refetchInterval: fastInterval,
  });

  const databaseQuery = useInternalPerformanceDatabaseStats({
    refetchInterval: fastInterval,
  });

  const tenantScopeQuery = useInternalTenantScopeDiagnostics({
    refetchInterval: fastInterval,
  });

  const webVitalsQuery = useInternalMonitoringWebVitals(24, {
    refetchInterval: slowInterval,
  });

  const securitySummaryQuery = useInternalMonitoringSecuritySummary(24, {
    refetchInterval: slowInterval,
  });

  const queueHealthQuery = useInternalMonitoringQueueHealth({
    refetchInterval: fastInterval,
  });

  const loading =
    dashboardQuery.isLoading ||
    monitoringHealthQuery.isLoading ||
    appHealthQuery.isLoading ||
    performanceQuery.isLoading ||
    databaseQuery.isLoading ||
    tenantScopeQuery.isLoading;

  const dashboard = dashboardQuery.data;
  const monitoringHealth = monitoringHealthQuery.data;
  const appHealth = appHealthQuery.data;
  const performance = performanceQuery.data;
  const database = databaseQuery.data;
  const tenantScope = tenantScopeQuery.data;
  const detailedChecks = appHealth?.checks as
    | Record<string, { status: string; latency?: number; error?: string }>
    | undefined;

  const liveResponseTime = monitoringHealth?.avgResponseTime ?? 0;
  const requestsLastHour = monitoringHealth?.requestsLastHour ?? 0;
  const errorsLastHour = monitoringHealth?.errorsLastHour ?? 0;
  const errorRate =
    requestsLastHour > 0
      ? Number(((errorsLastHour / requestsLastHour) * 100).toFixed(2))
      : 0;
  const heapUsagePercent = performance
    ? Math.round(
        (performance.memory.heapUsed /
          Math.max(performance.memory.heapTotal, 1)) *
          100,
      )
    : 0;
  const responseBuckets =
    dashboard?.last7Days.performance.responseTimeDistribution ?? [];
  const slowestEndpoints =
    dashboard?.last7Days.performance.slowestEndpoints ?? [];
  const tenantScopeIssueCount =
    (tenantScope?.uncoveredClinicIdModels.length ?? 0) +
    (tenantScope?.staleRelationRules.length ?? 0);
  const tenantScopeStatus = tenantScopeQuery.isError
    ? "critical"
    : tenantScope
      ? tenantScopeIssueCount === 0
        ? "healthy"
        : "critical"
      : "warning";
  const throughputByMinute = useMemo(
    () => dashboard?.last7Days.performance.throughputByMinute ?? [],
    [dashboard],
  );
  const maxThroughputCount = useMemo(
    () =>
      throughputByMinute.reduce(
        (max, bucket) => Math.max(max, bucket.count),
        0,
      ),
    [throughputByMinute],
  );

  const handleRefresh = () => {
    setRefreshing(true);
    Promise.all([
      dashboardQuery.refetch(),
      monitoringHealthQuery.refetch(),
      appHealthQuery.refetch(),
      performanceQuery.refetch(),
      databaseQuery.refetch(),
      tenantScopeQuery.refetch(),
      webVitalsQuery.refetch(),
      securitySummaryQuery.refetch(),
      queueHealthQuery.refetch(),
    ]).finally(() => {
      setRefreshing(false);
    });
  };

  const getStatusIcon = (status: string) =>
    createElement(SystemHealthIcon, { status });

  const getStatusBadge = (status: string) =>
    createElement(SystemHealthBadge, { status });

  const healthSummary = useMemo(() => {
    if (!monitoringHealth) {
      return null;
    }

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
  }, [
    errorRate,
    errorsLastHour,
    liveResponseTime,
    monitoringHealth,
    requestsLastHour,
  ]);

  return {
    refreshing,
    autoRefresh,
    setAutoRefresh,
    handleRefresh,
    loading,
    dashboard,
    monitoringHealth,
    appHealth,
    performance,
    database,
    tenantScope,
    detailedChecks,
    liveResponseTime,
    requestsLastHour,
    errorsLastHour,
    errorRate,
    heapUsagePercent,
    responseBuckets,
    slowestEndpoints,
    tenantScopeIssueCount,
    tenantScopeStatus,
    throughputByMinute,
    maxThroughputCount,
    getStatusIcon,
    getStatusBadge,
    healthSummary,
    webVitalsQuery,
    securitySummaryQuery,
    queueHealthQuery,
    tenantScopeQuery,
  };
}

export type SystemMonitoringPageViewModel = ReturnType<
  typeof useSystemMonitoringPage
>;
