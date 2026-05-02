"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sanitizeUserFacingMessage } from "@workspace/types";
import { DATE_FORMATS, formatCountLocale, formatDate } from "@workspace/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";
import { PageHeader } from "@workspace/ui/components/page-header";
import { Progress } from "@workspace/ui/components/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  healthAPI,
  monitoringAPI,
  operationsAPI,
  performanceAPI,
} from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { useAuth } from "@/lib/auth";
import { internalQueryKeys } from "@/lib/query-keys";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  RefreshCw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Wifi,
  XCircle,
} from "lucide-react";

function formatBytesToMb(value: number): string {
  return `${value} MB`;
}

export default function SystemMonitoringPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { token } = useAuth();

  const dashboardQuery = useQuery({
    queryKey: internalQueryKeys.internal.monitoringDashboard(),
    queryFn: () => monitoringAPI.getDashboard(),
    enabled: Boolean(token),
    refetchInterval: autoRefresh && token ? 30000 : false,
  });

  const monitoringHealthQuery = useQuery({
    queryKey: internalQueryKeys.internal.monitoringHealth(),
    queryFn: () => monitoringAPI.getHealth(),
    enabled: Boolean(token),
    refetchInterval: autoRefresh && token ? 30000 : false,
  });

  const appHealthQuery = useQuery({
    queryKey: ["health", "system-monitoring"],
    queryFn: () => healthAPI.getHealth(),
    enabled: Boolean(token),
    refetchInterval: autoRefresh && token ? 30000 : false,
  });

  const performanceQuery = useQuery({
    queryKey: internalQueryKeys.internal.performanceMetrics(),
    queryFn: () => performanceAPI.getMetrics(),
    enabled: Boolean(token),
    refetchInterval: autoRefresh && token ? 30000 : false,
  });

  const databaseQuery = useQuery({
    queryKey: internalQueryKeys.internal.performanceDatabase(),
    queryFn: () => performanceAPI.getDatabaseStats(),
    enabled: Boolean(token),
    refetchInterval: autoRefresh && token ? 30000 : false,
  });

  const tenantScopeQuery = useQuery({
    queryKey: internalQueryKeys.internal.tenantScopeDiagnostics(),
    queryFn: () => operationsAPI.getTenantScopeDiagnostics(),
    enabled: Boolean(token),
    refetchInterval: autoRefresh && token ? 30000 : false,
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
    ]).finally(() => {
      setRefreshing(false);
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
      case "ok":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "degraded":
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case "unhealthy":
      case "critical":
      case "error":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Activity className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
      case "ok":
        return <Badge className="badge-success">Healthy</Badge>;
      case "degraded":
      case "warning":
        return (
          <Badge className="badge-warning">
            {status === "degraded" ? "Degraded" : "Warning"}
          </Badge>
        );
      case "unhealthy":
      case "critical":
      case "error":
        return <Badge variant="destructive">Unhealthy</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

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
