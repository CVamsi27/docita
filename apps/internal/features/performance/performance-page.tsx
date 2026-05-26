"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import Link from "next/link";
import { Button } from "@workspace/ui/components/form/button";
import { Progress } from "@workspace/ui/components/feedback/progress";
import {
  SystemHealthBadge,
  SystemHealthIcon,
} from "@workspace/ui/components/feedback/system-health-indicator";
import { formatCountLocale } from "@workspace/utils";
import {
  useInternalHealthCheck,
  useInternalMonitoringHealth,
  useInternalPerformanceDatabaseStats,
  useInternalPerformanceMetrics,
} from "@workspace/data-access/internal";
import {
  Activity,
  AlertTriangle,
  Clock,
  Cpu,
  Database,
  Server,
  Wifi,
} from "lucide-react";

export default function PerformancePage() {
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

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Performance"
          description="Live runtime, database, and request metrics"
          size="compact"
          actions={
            <Button variant="outline" size="sm" asChild>
              <Link href="/system-monitoring">System monitoring</Link>
            </Button>
          }
        />
      }
    >
      <DataState
        status={pageStatus}
        loadingMessage="Loading performance metrics…"
        errorMessage="We could not load live performance metrics. Please try again."
        onRetry={() => {
          void runtimeQuery.refetch();
          void databaseQuery.refetch();
          void healthQuery.refetch();
          void appHealthQuery.refetch();
        }}
      >
      {runtime && database && health ? (
      <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-success">
              {runtime.uptime.formatted}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCountLocale(runtime.uptime.seconds)} seconds
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Response Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">{averageResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">
              Monitoring average from the last hour
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requests/min</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">{requestsPerMinute}</div>
            <p className="text-xs text-muted-foreground">
              Derived from live request counts
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-success">
              {health.requestsLastHour > 0
                ? (
                    (health.errorsLastHour / health.requestsLastHour) *
                    100
                  ).toFixed(2)
                : "0.00"}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {formatCountLocale(health.errorsLastHour)} errors in the last hour
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Time</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">{totalCpuSeconds}s</div>
            <p className="text-xs text-muted-foreground">
              User {appHealth?.checks.cpu.user.toFixed(2) ?? "0.00"}s, system{" "}
              {appHealth?.checks.cpu.system.toFixed(2) ?? "0.00"}s
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory usage</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">{heapUsagePercent}%</div>
            <Progress value={heapUsagePercent} className="h-2" />
            <p className="text-xs text-muted-foreground">
              RSS {runtime.memory.rss} MB, heap {runtime.memory.heapUsed} of{" "}
              {runtime.memory.heapTotal} MB
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Database Query Time
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
              {database.queryResponseTimeMs}ms
            </div>
            <div className="flex items-center gap-2">
              <SystemHealthIcon size="sm" status={database.status} />
              <SystemHealthBadge status={database.status} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service health</CardTitle>
          <CardDescription>
            Status of the live API runtime and database connection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[var(--radius)] border border-border/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <SystemHealthIcon
                    size="sm"
                    status={appHealth?.status ?? "unknown"}
                  />
                  <div>
                    <p className="font-medium">API Health</p>
                    <p className="text-sm text-muted-foreground">
                      {appHealth?.status ?? "unknown"}
                    </p>
                  </div>
                </div>
                <SystemHealthBadge status={appHealth?.status ?? "unknown"} />
              </div>
            </div>
            <div className="rounded-[var(--radius)] border border-border/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <SystemHealthIcon
                    size="sm"
                    status={health.databaseConnected ? "healthy" : "critical"}
                  />
                  <div>
                    <p className="font-medium">Monitoring DB</p>
                    <p className="text-sm text-muted-foreground">
                      {health.databaseConnected ? "Connected" : "Disconnected"}
                    </p>
                  </div>
                </div>
                <SystemHealthBadge
                  status={health.databaseConnected ? "healthy" : "critical"}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </>
      ) : null}
      </DataState>
    </AppPageScaffold>
  );
}
