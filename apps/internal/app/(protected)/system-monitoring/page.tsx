"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { sanitizeUserFacingMessage } from "@workspace/types";
import { DATE_FORMATS, formatCountLocale, formatDate } from "@workspace/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { Progress } from "@workspace/ui/components/feedback/progress";
import {
  SystemHealthBadge,
  SystemHealthIcon,
} from "@workspace/ui/components/feedback/system-health-indicator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/navigation/tabs";
import {
  healthAPI,
  monitoringAPI,
  operationsAPI,
  performanceAPI,
} from "@/lib/api/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { internalQueryKeys } from "@/lib/api/query-keys";
import { useInternalQuery } from "@/lib/api/use-internal-query";
import {
  Activity,
  AlertTriangle,
  Clock,
  Cpu,
  Database,
  ExternalLink,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Wifi,
} from "lucide-react";

function formatBytesToMb(value: number): string {
  return `${value} MB`;
}

function buildPrometheusMetricsUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    return null;
  }
  try {
    const parsed = new URL(base);
    parsed.pathname = "/metrics";
    parsed.search = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

export default function SystemMonitoringPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const fastInterval = autoRefresh ? 30000 : false;
  const slowInterval = autoRefresh ? 60000 : false;

  const dashboardQuery = useInternalQuery({
    queryKey: internalQueryKeys.internal.monitoringDashboard(),
    queryFn: () => monitoringAPI.getDashboard(),
    refetchInterval: fastInterval,
  });

  const monitoringHealthQuery = useInternalQuery({
    queryKey: internalQueryKeys.internal.monitoringHealth(),
    queryFn: () => monitoringAPI.getHealth(),
    refetchInterval: fastInterval,
  });

  const appHealthQuery = useInternalQuery({
    queryKey: ["health", "system-monitoring"] as const,
    queryFn: () => healthAPI.getHealth(),
    refetchInterval: fastInterval,
  });

  const performanceQuery = useInternalQuery({
    queryKey: internalQueryKeys.internal.performanceMetrics(),
    queryFn: () => performanceAPI.getMetrics(),
    refetchInterval: fastInterval,
  });

  const databaseQuery = useInternalQuery({
    queryKey: internalQueryKeys.internal.performanceDatabase(),
    queryFn: () => performanceAPI.getDatabaseStats(),
    refetchInterval: fastInterval,
  });

  const tenantScopeQuery = useInternalQuery({
    queryKey: internalQueryKeys.internal.tenantScopeDiagnostics(),
    queryFn: () => operationsAPI.getTenantScopeDiagnostics(),
    refetchInterval: fastInterval,
  });

  const webVitalsQuery = useInternalQuery({
    queryKey: internalQueryKeys.internal.monitoringWebVitals("24h", "rolling"),
    queryFn: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      return monitoringAPI.getWebVitalsAggregates(
        start.toISOString(),
        end.toISOString(),
      );
    },
    refetchInterval: slowInterval,
  });

  const securitySummaryQuery = useInternalQuery({
    queryKey: internalQueryKeys.internal.monitoringSecuritySummary(
      "24h",
      "rolling",
    ),
    queryFn: () => {
      const end = new Date();
      const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
      return monitoringAPI.getSecuritySummary(
        start.toISOString(),
        end.toISOString(),
      );
    },
    refetchInterval: slowInterval,
  });

  const queueHealthQuery = useInternalQuery({
    queryKey: internalQueryKeys.internal.monitoringQueueHealth(),
    queryFn: () => monitoringAPI.getQueueHealth(),
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

  const getStatusIcon = (status: string) => (
    <SystemHealthIcon status={status} />
  );

  const getStatusBadge = (status: string) => (
    <SystemHealthBadge status={status} />
  );

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

  if (loading) {
    return (
      <div
        className="flex h-64 flex-col items-center justify-center gap-2"
        role="status"
        aria-live="polite"
        aria-label="Loading system monitoring"
      >
        <DocitaLoadingIndicator
          variant="section"
          withStatusRole={false}
          iconClassName="h-8 w-8 text-muted-foreground"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Monitoring"
        description="Live health, performance, and request telemetry"
        size="compact"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? "Auto-refresh: ON" : "Auto-refresh: OFF"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="experience">Experience</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="queues">Queues</TabsTrigger>
          <TabsTrigger value="ops">Ops</TabsTrigger>
          <TabsTrigger value="tenant-scope">Tenant Scope</TabsTrigger>
          <TabsTrigger value="health">Health Checks</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-success">
                  {performance ? performance.uptime.formatted : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {performance
                    ? `${formatCountLocale(performance.uptime.seconds)} seconds`
                    : "Waiting for live metrics"}
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
                <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                  {liveResponseTime.toFixed(2)}ms
                </div>
                <p className="text-xs text-muted-foreground">
                  Last hour average from the monitoring pipeline
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Requests last hour
                </CardTitle>
                <Wifi className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                  {formatCountLocale(requestsLastHour)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Live traffic observed in the last 60 minutes
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Error Rate
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-success">
                  {errorRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCountLocale(errorsLastHour)} errors in the last hour
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Heap Usage
                </CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">{heapUsagePercent}%</div>
                <Progress value={heapUsagePercent} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {performance
                    ? `${formatBytesToMb(performance.memory.heapUsed)} used of ${formatBytesToMb(performance.memory.heapTotal)}`
                    : "Waiting for memory metrics"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU Time</CardTitle>
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                  {monitoringHealth
                    ? `${(monitoringHealth.cpuUsage.user + monitoringHealth.cpuUsage.system).toFixed(2)}s`
                    : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  User {monitoringHealth?.cpuUsage.user.toFixed(2) ?? "0.00"}s,
                  system{" "}
                  {monitoringHealth?.cpuUsage.system.toFixed(2) ?? "0.00"}s
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Database Query
                </CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                  {database ? `${database.queryResponseTimeMs}ms` : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {database?.status ?? "Waiting for database metrics"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Tenant Coverage
                </CardTitle>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                  {tenantScope ? tenantScope.scopedModels : "N/A"}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(tenantScopeStatus)}
                  <span className="text-xs text-muted-foreground">
                    {tenantScopeIssueCount} open issues
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Live System Summary</CardTitle>
              <CardDescription>
                Combined status from monitoring, app health, and database checks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {healthSummary?.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[var(--radius)] border border-border/70 p-4 flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        <p className="font-medium">{item.label}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{item.value}</p>
                      {getStatusBadge(item.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-success">
                  {performance?.uptime.formatted ?? "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Process uptime from the runtime API
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Node Runtime
                </CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                  {performance?.node.version ?? "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {performance
                    ? `${performance.node.platform} / ${performance.node.arch}`
                    : "Waiting for runtime metrics"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Requests per minute
                </CardTitle>
                <Wifi className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                  {monitoringHealth
                    ? (monitoringHealth.requestsLastHour / 60).toFixed(2)
                    : "0.00"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Derived from live request volume
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Database Status
                </CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                  {database?.status ?? "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {database
                    ? `${database.queryResponseTimeMs}ms query time`
                    : "Waiting for database stats"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Memory Breakdown</CardTitle>
                <CardDescription>Live Node process memory</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>RSS</span>
                    <span>
                      {performance
                        ? formatBytesToMb(performance.memory.rss)
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Heap used</span>
                    <span>
                      {performance
                        ? formatBytesToMb(performance.memory.heapUsed)
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Heap total</span>
                    <span>
                      {performance
                        ? formatBytesToMb(performance.memory.heapTotal)
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>External</span>
                    <span>
                      {performance
                        ? formatBytesToMb(performance.memory.external)
                        : "N/A"}
                    </span>
                  </div>
                </div>
                <Progress value={heapUsagePercent} className="h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Slowest Endpoints</CardTitle>
                <CardDescription>
                  Highest average duration over the last 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {slowestEndpoints.slice(0, 5).map((endpoint) => (
                    <div
                      key={`${endpoint.method}-${endpoint.path}`}
                      className="rounded-[var(--radius)] border border-border/70 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">
                          {endpoint.method} {endpoint.path}
                        </p>
                        <Badge variant="outline">
                          {endpoint.avgDuration.toFixed(2)}ms
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {endpoint.count} requests, max{" "}
                        {endpoint.maxDuration.toFixed(2)}ms
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Throughput</CardTitle>
                <CardDescription>Requests observed per minute</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {throughputByMinute.slice(-12).map((bucket) => (
                    <div key={bucket.minute} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>
                          {formatDate(
                            new Date(`${bucket.minute}:00Z`),
                            DATE_FORMATS.TIME_SHORT,
                            { timezone: "UTC" },
                          )}
                        </span>
                        <span>{bucket.count}</span>
                      </div>
                      <Progress
                        value={
                          maxThroughputCount > 0
                            ? Math.round(
                                (bucket.count / maxThroughputCount) * 100,
                              )
                            : 0
                        }
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Response Time Distribution</CardTitle>
              <CardDescription>
                Request latency buckets from live API request logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-7">
                {responseBuckets.map((bucket) => (
                  <div
                    key={bucket.range}
                    className="rounded-[var(--radius)] border border-border/70 p-3 text-center"
                  >
                    <p className="text-xs text-muted-foreground">
                      {bucket.range}
                    </p>
                    <p className="mt-2 text-[var(--fs-xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">{bucket.count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="experience" className="space-y-6">
          <DataState
            status={
              webVitalsQuery.isLoading
                ? "loading"
                : webVitalsQuery.isError
                  ? "error"
                  : "success"
            }
            loadingMessage="Loading Core Web Vitals aggregates…"
            errorMessage={
              webVitalsQuery.error instanceof Error
                ? webVitalsQuery.error.message
                : "Could not load web vitals."
            }
            onRetry={() => void webVitalsQuery.refetch()}
          >
            <Card>
              <CardHeader>
                <CardTitle>Core Web Vitals (24h)</CardTitle>
                <CardDescription>
                  Browser RUM aggregated from production beacons (LCP, INP, CLS,
                  FCP, TTFB). Values use the same thresholds as the API rating
                  helper.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {(webVitalsQuery.data?.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No vitals recorded in this window yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Metric</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Avg</TableHead>
                          <TableHead className="text-right">p95</TableHead>
                          <TableHead className="text-right">Rating</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(webVitalsQuery.data ?? []).map((row) => (
                          <TableRow key={row.name}>
                            <TableCell className="font-medium">
                              {row.name}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCountLocale(row.count)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {row.avg.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {row.p95.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{row.rating}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </DataState>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <DataState
            status={
              securitySummaryQuery.isLoading
                ? "loading"
                : securitySummaryQuery.isError
                  ? "error"
                  : "success"
            }
            loadingMessage="Loading API security signals…"
            errorMessage={
              securitySummaryQuery.error instanceof Error
                ? securitySummaryQuery.error.message
                : "Could not load security summary."
            }
            onRetry={() => void securitySummaryQuery.refetch()}
          >
            {securitySummaryQuery.data ? (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        401 Unauthorized
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                        {formatCountLocale(
                          securitySummaryQuery.data.status401,
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Rolling 24h from request logs
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        403 Forbidden
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                        {formatCountLocale(
                          securitySummaryQuery.data.status403,
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Rolling 24h from request logs
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        429 Rate limited
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                        {formatCountLocale(
                          securitySummaryQuery.data.status429,
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Rolling 24h from request logs
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        5xx errors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                        {formatCountLocale(
                          securitySummaryQuery.data.status5xx,
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Server errors in window
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
                    <div>
                      <CardTitle>Top auth and rate-limit routes</CardTitle>
                      <CardDescription>
                        Paths with 401, 403, or 429 in the selected window (counts
                        only, no request bodies).
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/audits">Open audit log</Link>
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {securitySummaryQuery.data.topAuthFailureRoutes.length ===
                    0 ? (
                      <p className="text-sm text-muted-foreground">
                        No matching responses in this window.
                      </p>
                    ) : (
                      <div className="max-h-[360px] overflow-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Path</TableHead>
                              <TableHead>Method</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Count</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {securitySummaryQuery.data.topAuthFailureRoutes.map(
                              (row) => (
                                <TableRow
                                  key={`${row.method}-${row.path}-${row.statusCode}`}
                                >
                                  <TableCell className="max-w-[280px] truncate font-mono text-xs">
                                    {row.path}
                                  </TableCell>
                                  <TableCell>{row.method}</TableCell>
                                  <TableCell>{row.statusCode}</TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {formatCountLocale(row.count)}
                                  </TableCell>
                                </TableRow>
                              ),
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : null}
          </DataState>
        </TabsContent>

        <TabsContent value="queues" className="space-y-6">
          <DataState
            status={
              queueHealthQuery.isLoading
                ? "loading"
                : queueHealthQuery.isError
                  ? "error"
                  : "success"
            }
            loadingMessage="Loading queue health…"
            errorMessage={
              queueHealthQuery.error instanceof Error
                ? queueHealthQuery.error.message
                : "Could not load queue health."
            }
            onRetry={() => void queueHealthQuery.refetch()}
          >
            {queueHealthQuery.data ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Background queue snapshot</CardTitle>
                    <CardDescription>
                      Live counts from the{" "}
                      <span className="font-mono text-xs">QueueJob</span> table.
                      Worker Prometheus histograms run in the worker process; scrape
                      them separately if you expose a metrics port on Fly.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {queueHealthQuery.data.countsByStatus.map((row) => (
                        <div
                          key={row.status}
                          className="rounded-[var(--radius)] border border-border/70 p-3"
                        >
                          <p className="text-xs text-muted-foreground">
                            {row.status}
                          </p>
                          <p className="text-[var(--fs-xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                            {formatCountLocale(row.count)}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      Dead-lettered (last 24h):{" "}
                      <span className="font-medium text-foreground">
                        {formatCountLocale(
                          queueHealthQuery.data.deadLetteredLast24h,
                        )}
                      </span>
                    </p>
                  </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Top waiting queues</CardTitle>
                      <CardDescription>By job name</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {queueHealthQuery.data.topQueuesByWaiting.length === 0 ? (
                        <p className="text-sm text-muted-foreground">None</p>
                      ) : (
                        <ul className="space-y-2 text-sm">
                          {queueHealthQuery.data.topQueuesByWaiting.map(
                            (row) => (
                              <li
                                key={row.name}
                                className="flex justify-between gap-2"
                              >
                                <span className="truncate font-mono text-xs">
                                  {row.name}
                                </span>
                                <span className="tabular-nums">
                                  {formatCountLocale(row.count)}
                                </span>
                              </li>
                            ),
                          )}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Top failed queues</CardTitle>
                      <CardDescription>By job name</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {queueHealthQuery.data.topQueuesByFailed.length === 0 ? (
                        <p className="text-sm text-muted-foreground">None</p>
                      ) : (
                        <ul className="space-y-2 text-sm">
                          {queueHealthQuery.data.topQueuesByFailed.map((row) => (
                            <li
                              key={row.name}
                              className="flex justify-between gap-2"
                            >
                              <span className="truncate font-mono text-xs">
                                {row.name}
                              </span>
                              <span className="tabular-nums">
                                {formatCountLocale(row.count)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : null}
          </DataState>
        </TabsContent>

        <TabsContent value="ops" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Operations links</CardTitle>
              <CardDescription>
                Non-secret URLs only. Configure via{" "}
                <span className="font-mono text-xs">NEXT_PUBLIC_OPS_*</span>{" "}
                environment variables.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[var(--radius)] border border-border/70 p-4">
                <p className="text-sm font-medium">API Prometheus scrape</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  The Nest API exposes unversioned metrics at{" "}
                  <span className="font-mono">/metrics</span> on the API origin
                  (protect at the edge in production).
                </p>
                {buildPrometheusMetricsUrl() ? (
                  <a
                    href={buildPrometheusMetricsUrl() ?? "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    Open metrics endpoint
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Set <span className="font-mono">NEXT_PUBLIC_API_URL</span> to
                    derive the metrics URL.
                  </p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    label: "Prometheus",
                    url: process.env.NEXT_PUBLIC_OPS_PROMETHEUS_URL,
                  },
                  {
                    label: "Grafana",
                    url: process.env.NEXT_PUBLIC_OPS_GRAFANA_URL,
                  },
                  {
                    label: "Fly.io dashboard",
                    url: process.env.NEXT_PUBLIC_OPS_FLY_DASHBOARD_URL,
                  },
                  {
                    label: "Sentry (org or project)",
                    url: process.env.NEXT_PUBLIC_OPS_SENTRY_URL,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[var(--radius)] border border-border/70 p-4"
                  >
                    <p className="text-sm font-medium">{item.label}</p>
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline break-all"
                      >
                        {item.url}
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </a>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Not configured for this deployment.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tenant-scope" className="flex flex-col gap-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Scoped</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                  {tenantScope?.scopedModels ?? "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {tenantScope?.clinicIdModels ?? 0} models carry clinicId
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Direct</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                  {tenantScope?.directScopedModels ?? "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Scalar clinicId filters
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Relation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                  {tenantScope?.relationScopedModels ?? "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Nested tenant filters
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Issues</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                  {tenantScopeIssueCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Uncovered models or stale rules
                </p>
              </CardContent>
            </Card>
          </div>

          {tenantScopeQuery.isError ? (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldAlert className="h-4 w-4" />
                  {sanitizeUserFacingMessage(
                    tenantScopeQuery.error instanceof Error
                      ? tenantScopeQuery.error.message
                      : "Tenant diagnostics did not load",
                    "Tenant diagnostics did not load",
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>Tenant Scope Rules</CardTitle>
                      <CardDescription>
                        Schema-backed coverage from the API Prisma extension
                      </CardDescription>
                    </div>
                    {getStatusBadge(tenantScopeStatus)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[520px] overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Model</TableHead>
                          <TableHead>Scope</TableHead>
                          <TableHead>Path</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(tenantScope?.rules ?? []).map((rule) => (
                          <TableRow key={rule.model}>
                            <TableCell className="font-medium">
                              {rule.model}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  rule.kind === "direct"
                                    ? "secondary"
                                    : "outline"
                                }
                              >
                                {rule.kind}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {rule.path?.join(" -> ") ?? "clinicId"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Coverage Status</CardTitle>
                    <CardDescription>
                      Open tenant-scope findings from the generated datamodel
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                      <span className="text-sm font-medium">Uncovered</span>
                      <Badge
                        variant={
                          tenantScope?.uncoveredClinicIdModels.length
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {tenantScope?.uncoveredClinicIdModels.length ?? 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                      <span className="text-sm font-medium">Stale rules</span>
                      <Badge
                        variant={
                          tenantScope?.staleRelationRules.length
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {tenantScope?.staleRelationRules.length ?? 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                      <span className="text-sm font-medium">Excluded</span>
                      <Badge variant="outline">
                        {tenantScope?.excludedClinicIdModels.length ?? 0}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Exceptions</CardTitle>
                    <CardDescription>
                      ClinicId models intentionally outside auto-scoping
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {(tenantScope?.excludedClinicIdModels ?? []).map(
                        (model) => (
                          <Badge key={model} variant="outline">
                            {model}
                          </Badge>
                        ),
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          {appHealth ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Overall System Status</CardTitle>
                  <CardDescription>
                    Live health check from the API runtime
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-4">
                    {getStatusIcon(appHealth.status)}
                    {getStatusBadge(appHealth.status)}
                    <span className="text-muted-foreground">
                      Last checked:{" "}
                      {appHealth.timestamp
                        ? formatDate(
                            appHealth.timestamp,
                            DATE_FORMATS.DATETIME_LONG,
                          )
                        : "N/A"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {appHealth.checks && (
                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Health Checks</CardTitle>
                    <CardDescription>
                      Database, memory, and CPU checks returned by `/health`
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(detailedChecks ?? {}).map(
                        ([serviceName, checkData]) => (
                          <div
                            key={serviceName}
                            className="flex items-center justify-between rounded-[var(--radius)] border border-border/70 p-3"
                          >
                            <div className="flex items-center gap-3">
                              {getStatusIcon(checkData.status as string)}
                              <div>
                                <p className="font-medium capitalize">
                                  {serviceName}
                                </p>
                                {checkData.error && (
                                  <p className="text-sm text-muted-foreground">
                                    {sanitizeUserFacingMessage(
                                      checkData.error,
                                      "This check did not complete",
                                    )}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {checkData.latency !== undefined && (
                                <span className="text-xs text-muted-foreground">
                                  {checkData.latency}ms
                                </span>
                              )}
                              {getStatusBadge(checkData.status as string)}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldAlert className="h-4 w-4" />
                  We could not load this health data. Please try again.
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
