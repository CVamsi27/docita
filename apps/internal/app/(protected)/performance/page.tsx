"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Progress } from "@workspace/ui/components/progress";
import {
  SystemHealthBadge,
  SystemHealthIcon,
} from "@workspace/ui/components/system-health-indicator";
import { formatCountLocale } from "@workspace/utils";
import { healthAPI, monitoringAPI, performanceAPI } from "@/lib/api";
import { internalQueryKeys } from "@/lib/query-keys";
import { useInternalQuery } from "@/lib/use-internal-query";
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
  const runtimeQuery = useInternalQuery({
    queryKey: internalQueryKeys.internal.performanceMetrics(),
    queryFn: () => performanceAPI.getMetrics(),
    refetchInterval: 30000,
  });

  const databaseQuery = useInternalQuery({
    queryKey: internalQueryKeys.internal.performanceDatabase(),
    queryFn: () => performanceAPI.getDatabaseStats(),
    refetchInterval: 30000,
  });

  const healthQuery = useInternalQuery({
    queryKey: internalQueryKeys.internal.monitoringHealth(),
    queryFn: () => monitoringAPI.getHealth(),
    refetchInterval: 30000,
  });

  const appHealthQuery = useInternalQuery({
    queryKey: ["health", "performance"] as const,
    queryFn: () => healthAPI.getHealth(),
    refetchInterval: 30000,
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

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Performance"
          description="Loading live performance metrics…"
          size="compact"
        />
        <div
          className="flex h-40 flex-col items-center justify-center gap-2"
          role="status"
          aria-live="polite"
          aria-label="Loading performance metrics"
        >
          <DocitaLoadingIndicator
            variant="section"
            withStatusRole={false}
            iconClassName="h-8 w-8 text-muted-foreground"
          />
        </div>
      </div>
    );
  }

  if (!runtime || !database || !health) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Performance"
          description="We could not load these live performance metrics. Please try again."
          size="compact"
        />
      </div>
    );
  }

  const requestsPerMinute = (health.requestsLastHour / 60).toFixed(2);
  const averageResponseTime = health.avgResponseTime.toFixed(2);
  const totalCpuSeconds = appHealth
    ? (appHealth.checks.cpu.user + appHealth.checks.cpu.system).toFixed(2)
    : "0.00";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance"
        description="Live runtime, database, and request metrics"
        size="compact"
      />

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
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
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
          <CardTitle>Service Health</CardTitle>
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
    </div>
  );
}
