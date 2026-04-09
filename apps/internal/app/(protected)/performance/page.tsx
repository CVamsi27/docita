"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Progress } from "@workspace/ui/components/progress";
import { useAuth } from "@/lib/auth";
import {
  healthAPI,
  monitoringAPI,
  performanceAPI,
} from "@/lib/api";
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
  Wifi,
  XCircle,
} from "lucide-react";

function getStatusIcon(status: string) {
  switch (status) {
    case "healthy":
    case "ok":
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case "warning":
    case "degraded":
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case "critical":
    case "error":
    case "unhealthy":
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return null;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "healthy":
    case "ok":
      return <Badge className="badge-success">Healthy</Badge>;
    case "warning":
    case "degraded":
      return <Badge className="badge-warning">Warning</Badge>;
    case "critical":
    case "error":
    case "unhealthy":
      return <Badge variant="destructive">Unhealthy</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function PerformancePage() {
  const { token } = useAuth();

  const runtimeQuery = useQuery({
    queryKey: internalQueryKeys.internal.performanceMetrics(),
    queryFn: () => performanceAPI.getMetrics(),
    enabled: Boolean(token),
    refetchInterval: token ? 30000 : false,
  });

  const databaseQuery = useQuery({
    queryKey: internalQueryKeys.internal.performanceDatabase(),
    queryFn: () => performanceAPI.getDatabaseStats(),
    enabled: Boolean(token),
    refetchInterval: token ? 30000 : false,
  });

  const healthQuery = useQuery({
    queryKey: internalQueryKeys.internal.monitoringHealth(),
    queryFn: () => monitoringAPI.getHealth(),
    enabled: Boolean(token),
    refetchInterval: token ? 30000 : false,
  });

  const appHealthQuery = useQuery({
    queryKey: ["health", "performance"],
    queryFn: () => healthAPI.getHealth(),
    enabled: Boolean(token),
    refetchInterval: token ? 30000 : false,
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
          <p className="text-muted-foreground">Loading live performance metrics...</p>
        </div>
        <div className="flex items-center justify-center h-40">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!runtime || !database || !health) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
          <p className="text-muted-foreground">
            Unable to load live performance metrics.
          </p>
        </div>
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Performance</h1>
        <p className="text-muted-foreground">
          Live runtime, database, and request metrics
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {runtime.uptime.formatted}
            </div>
            <p className="text-xs text-muted-foreground">
              {runtime.uptime.seconds.toLocaleString()} seconds
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
            <div className="text-2xl font-bold">{averageResponseTime}ms</div>
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
            <div className="text-2xl font-bold">{requestsPerMinute}</div>
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
            <div className="text-2xl font-bold text-success">
              {health.requestsLastHour > 0
                ? ((health.errorsLastHour / health.requestsLastHour) * 100).toFixed(2)
                : "0.00"}
              %
            </div>
            <p className="text-xs text-muted-foreground">
              {health.errorsLastHour.toLocaleString()} errors in the last hour
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
            <div className="text-2xl font-bold">{totalCpuSeconds}s</div>
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
            <div className="text-2xl font-bold">{heapUsagePercent}%</div>
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
            <div className="text-2xl font-bold">
              {database.queryResponseTimeMs}ms
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(database.status)}
              {getStatusBadge(database.status)}
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
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(appHealth?.status ?? "unknown")}
                  <div>
                    <p className="font-medium">API Health</p>
                    <p className="text-sm text-muted-foreground">
                      {appHealth?.status ?? "unknown"}
                    </p>
                  </div>
                </div>
                {getStatusBadge(appHealth?.status ?? "unknown")}
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(health.databaseConnected ? "healthy" : "critical")}
                  <div>
                    <p className="font-medium">Monitoring DB</p>
                    <p className="text-sm text-muted-foreground">
                      {health.databaseConnected ? "Connected" : "Disconnected"}
                    </p>
                  </div>
                </div>
                {getStatusBadge(health.databaseConnected ? "healthy" : "critical")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
