"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Progress } from "@workspace/ui/components/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { healthAPI, monitoringAPI, performanceAPI } from "@/lib/api";
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

  const loading =
    dashboardQuery.isLoading ||
    monitoringHealthQuery.isLoading ||
    appHealthQuery.isLoading ||
    performanceQuery.isLoading ||
    databaseQuery.isLoading;

  const dashboard = dashboardQuery.data;
  const monitoringHealth = monitoringHealthQuery.data;
  const appHealth = appHealthQuery.data;
  const performance = performanceQuery.data;
  const database = databaseQuery.data;
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
        (performance.memory.heapUsed / Math.max(performance.memory.heapTotal, 1)) *
          100,
      )
    : 0;
  const responseBuckets =
    dashboard?.last7Days.performance.responseTimeDistribution ?? [];
  const slowestEndpoints = dashboard?.last7Days.performance.slowestEndpoints ?? [];
  const throughputByMinute = useMemo(
    () => dashboard?.last7Days.performance.throughputByMinute ?? [],
    [dashboard],
  );
  const maxThroughputCount = useMemo(
    () => throughputByMinute.reduce((max, bucket) => Math.max(max, bucket.count), 0),
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
        value: `${requestsLastHour.toLocaleString()} last hour`,
        status: requestsLastHour > 0 ? "healthy" : "warning",
        description: "Traffic captured by the monitoring pipeline",
      },
      {
        label: "Errors",
        value: `${errorsLastHour.toLocaleString()} last hour`,
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
  }, [errorRate, errorsLastHour, liveResponseTime, monitoringHealth, requestsLastHour]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            System Monitoring
          </h1>
          <p className="text-muted-foreground">
            Live health, performance, and request telemetry
          </p>
        </div>
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
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
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
                <div className="text-2xl font-bold text-success">
                  {performance ? performance.uptime.formatted : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {performance
                    ? `${performance.uptime.seconds.toLocaleString()} seconds`
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
                <div className="text-2xl font-bold">
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
                <div className="text-2xl font-bold">
                  {requestsLastHour.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Live traffic observed in the last 60 minutes
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-success">
                  {errorRate}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {errorsLastHour.toLocaleString()} errors in the last hour
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Heap Usage
                </CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold">{heapUsagePercent}%</div>
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
                <div className="text-2xl font-bold">
                  {monitoringHealth
                    ? `${(monitoringHealth.cpuUsage.user + monitoringHealth.cpuUsage.system).toFixed(2)}s`
                    : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  User {monitoringHealth?.cpuUsage.user.toFixed(2) ?? "0.00"}s,
                  system {monitoringHealth?.cpuUsage.system.toFixed(2) ?? "0.00"}s
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
                <div className="text-2xl font-bold">
                  {database ? `${database.queryResponseTimeMs}ms` : "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {database?.status ?? "Waiting for database metrics"}
                </p>
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
                    className="rounded-lg border p-4 flex items-start justify-between gap-4"
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
                <div className="text-2xl font-bold text-success">
                  {performance?.uptime.formatted ?? "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Process uptime from the runtime API
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Node Runtime</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
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
                <div className="text-2xl font-bold">
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
                <CardTitle className="text-sm font-medium">Database Status</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {database?.status ?? "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {database ? `${database.queryResponseTimeMs}ms query time` : "Waiting for database stats"}
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
                    <span>{performance ? formatBytesToMb(performance.memory.rss) : "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Heap used</span>
                    <span>{performance ? formatBytesToMb(performance.memory.heapUsed) : "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Heap total</span>
                    <span>{performance ? formatBytesToMb(performance.memory.heapTotal) : "N/A"}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>External</span>
                    <span>{performance ? formatBytesToMb(performance.memory.external) : "N/A"}</span>
                  </div>
                </div>
                <Progress value={heapUsagePercent} className="h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Slowest Endpoints</CardTitle>
                <CardDescription>Highest average duration over the last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {slowestEndpoints.slice(0, 5).map((endpoint) => (
                    <div
                      key={`${endpoint.method}-${endpoint.path}`}
                      className="rounded-lg border p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium">{endpoint.method} {endpoint.path}</p>
                        <Badge variant="outline">{endpoint.avgDuration.toFixed(2)}ms</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {endpoint.count} requests, max {endpoint.maxDuration.toFixed(2)}ms
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
                        <span>{format(new Date(`${bucket.minute}:00Z`), "HH:mm")}</span>
                        <span>{bucket.count}</span>
                      </div>
                      <Progress
                        value={
                          maxThroughputCount > 0
                            ? Math.round((bucket.count / maxThroughputCount) * 100)
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
                  <div key={bucket.range} className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">{bucket.range}</p>
                    <p className="mt-2 text-xl font-semibold">{bucket.count}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
                        ? format(new Date(appHealth.timestamp), "PPpp")
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
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div className="flex items-center gap-3">
                              {getStatusIcon(checkData.status as string)}
                              <div>
                                <p className="font-medium capitalize">
                                  {serviceName}
                                </p>
                                {checkData.error && (
                                  <p className="text-sm text-muted-foreground">
                                    {checkData.error}
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
                  Unable to load health data
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
