"use client";

import { AppPageScaffold, Button, DataState, PageHeader } from "@workspace/ui/components";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useInternalHealthCheck, useInternalMonitoringHealth, useInternalPerformanceDatabaseStats, useInternalPerformanceMetrics } from "@workspace/data-access/internal";
import { MiddleMetricsCards, ServiceHealthSection, TopMetricsCards } from "./performance-page-sections";

export default function PerformancePage() {
  const t = useTranslations("Performance");
  const refetchInterval = 30_000;

  const runtimeQuery = useInternalPerformanceMetrics({ refetchInterval });
  const databaseQuery = useInternalPerformanceDatabaseStats({ refetchInterval });
  const healthQuery = useInternalMonitoringHealth({ refetchInterval });
  const appHealthQuery = useInternalHealthCheck("performance", {
    refetchInterval,
  });

  const runtime = runtimeQuery.data;
  const database = databaseQuery.data;
  const health = healthQuery.data;
  const appHealth = appHealthQuery.data;
  const loading =
    runtimeQuery.isLoading ||
    databaseQuery.isLoading ||
    healthQuery.isLoading ||
    appHealthQuery.isLoading;

  const heapUsagePercent = runtime
    ? Math.round(
        (runtime.memory.heapUsed / Math.max(runtime.memory.heapTotal, 1)) * 100,
      )
    : 0;

  const pageStatus = loading
    ? "loading"
    : !runtime || !database || !health
      ? "error"
      : "success";

  const requestsPerMinute = health
    ? (health.requestsLastHour / 60).toFixed(2)
    : "0.00";
  const averageResponseTime = health
    ? health.avgResponseTime.toFixed(2)
    : "0.00";
  const totalCpuSeconds = appHealth
    ? (appHealth.checks.cpu.user + appHealth.checks.cpu.system).toFixed(2)
    : "0.00";

  const errorRate =
    health && health.requestsLastHour > 0
      ? ((health.errorsLastHour / health.requestsLastHour) * 100).toFixed(2)
      : "0.00";

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title={t("pageTitle")}
          description={t("pageDescription")}
          size="compact"
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/system-monitoring">{t("systemMonitoringLink")}</Link>
            </Button>
          }
        />
      }
    >
      <DataState
        status={pageStatus}
        loadingMessage={t("loadingMessage")}
        errorMessage={t("errorMessage")}
        onRetry={() => {
          void runtimeQuery.refetch();
          void databaseQuery.refetch();
          void healthQuery.refetch();
          void appHealthQuery.refetch();
        }}
      >
      {runtime && database && health ? (
      <>
        <TopMetricsCards
          uptimeFormatted={runtime.uptime.formatted}
          uptimeSeconds={runtime.uptime.seconds}
          requestsPerMinute={requestsPerMinute}
          averageResponseTime={averageResponseTime}
          errorRate={errorRate}
          errorCount={health.errorsLastHour}
        />
        <MiddleMetricsCards
          totalCpuSeconds={totalCpuSeconds}
          cpuUser={appHealth?.checks.cpu.user ?? 0}
          cpuSystem={appHealth?.checks.cpu.system ?? 0}
          heapUsagePercent={heapUsagePercent}
          memoryRss={runtime.memory.rss}
          memoryHeapUsed={runtime.memory.heapUsed}
          memoryHeapTotal={runtime.memory.heapTotal}
          databaseQueryResponseTimeMs={database.queryResponseTimeMs}
          databaseStatus={database.status}
        />
        <ServiceHealthSection
          appHealthStatus={appHealth?.status ?? "unknown"}
          monitoringDbConnected={health.databaseConnected}
        />
      </>
      ) : null}
      </DataState>
    </AppPageScaffold>
  );
}
