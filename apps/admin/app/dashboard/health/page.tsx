"use client";

import { useState, useEffect, useCallback } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  healthAPI,
  type HealthCheckResult,
  type MonitoringDashboard,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import {
  RefreshCw,
  Activity,
  Database,
  Cpu,
  HardDrive,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Zap,
} from "lucide-react";

export default function SystemHealthPage() {
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [dashboard, setDashboard] = useState<MonitoringDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { token } = useAuth();

  const fetchData = useCallback(async () => {
    if (!token) return;

    try {
      const healthData = await healthAPI.getHealth();
      setHealth(healthData);
      // Note: monitoring/dashboard requires BASIC_ANALYTICS feature
      // which may not be available for all users, so we use null for now
      setDashboard(null);
    } catch (error) {
      console.error("Failed to fetch health data", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "degraded":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "unhealthy":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return (
          <Badge className="bg-green-500/15 text-green-700 hover:bg-green-500/25 border-green-500/20">
            Healthy
          </Badge>
        );
      case "degraded":
        return (
          <Badge className="bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/25 border-yellow-500/20">
            Degraded
          </Badge>
        );
      case "unhealthy":
        return <Badge variant="destructive">Unhealthy</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return <Badge variant="destructive">Critical</Badge>;
      case "ERROR":
        return (
          <Badge className="bg-red-500/15 text-red-700 hover:bg-red-500/25 border-red-500/20">
            Error
          </Badge>
        );
      case "WARNING":
        return (
          <Badge className="bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/25 border-yellow-500/20">
            Warning
          </Badge>
        );
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground">
            Monitor real-time system status, performance metrics, and error
            logs.
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

      {/* Overall Status Banner */}
      {health && (
        <Card
          className={`border-l-4 ${
            health.status === "healthy"
              ? "border-l-green-500"
              : health.status === "degraded"
                ? "border-l-yellow-500"
                : "border-l-red-500"
          }`}
        >
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getStatusIcon(health.status)}
                <div>
                  <p className="font-semibold text-lg">
                    System Status:{" "}
                    {health.status.charAt(0).toUpperCase() +
                      health.status.slice(1)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Last checked:{" "}
                    {format(new Date(health.timestamp), "MMM d, yyyy HH:mm:ss")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground">Version</p>
                  <p className="font-mono font-medium">{health.version}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Uptime</p>
                  <p className="font-mono font-medium">
                    {formatUptime(health.uptime)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Health Check Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        {/* Database Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {health && getStatusBadge(health.checks.database.status)}
              {health?.checks.database.latency && (
                <span className="text-sm text-muted-foreground">
                  {health.checks.database.latency}ms latency
                </span>
              )}
            </div>
            {health?.checks.database.error && (
              <p className="text-sm text-red-500 mt-2">
                {health.checks.database.error}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Memory Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                {health && getStatusBadge(health.checks.memory.status)}
                <span className="text-sm text-muted-foreground">
                  {health?.checks.memory.heapUsagePercent}% heap usage
                </span>
              </div>
              {health && (
                <>
                  <Progress
                    value={health.checks.memory.heapUsagePercent}
                    className="h-2"
                  />
                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div>
                      <p>Heap Used</p>
                      <p className="font-medium text-foreground">
                        {health.checks.memory.heapUsed}MB
                      </p>
                    </div>
                    <div>
                      <p>Heap Total</p>
                      <p className="font-medium text-foreground">
                        {health.checks.memory.heapTotal}MB
                      </p>
                    </div>
                    <div>
                      <p>RSS</p>
                      <p className="font-medium text-foreground">
                        {health.checks.memory.rss}MB
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* CPU Health */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU</CardTitle>
            <Cpu className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                {health && getStatusBadge(health.checks.cpu.status)}
              </div>
              {health && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">User</p>
                    <p className="font-medium">{health.checks.cpu.user}s</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">System</p>
                    <p className="font-medium">{health.checks.cpu.system}s</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed info */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="requests">Requests</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Requests (24h)
                </CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboard?.last24Hours.requests.totalRequests || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboard?.last24Hours.requests.successfulRequests || 0}{" "}
                  successful
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Errors (24h)
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboard?.last24Hours.errors.totalErrors || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {dashboard?.last24Hours.errors.unresolvedErrors || 0}{" "}
                  unresolved
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
                  {Math.round(
                    dashboard?.last24Hours.requests.avgResponseTime || 0,
                  )}
                  ms
                </div>
                <p className="text-xs text-muted-foreground">Last 24 hours</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Success Rate
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboard?.last24Hours.requests.totalRequests
                    ? Math.round(
                        ((dashboard.last24Hours.requests.successfulRequests ||
                          0) /
                          dashboard.last24Hours.requests.totalRequests) *
                          100,
                      )
                    : 100}
                  %
                </div>
                <p className="text-xs text-muted-foreground">Last 24 hours</p>
              </CardContent>
            </Card>
          </div>

          {/* Request Distribution by Status */}
          {dashboard?.last24Hours.requests.requestsByStatus && (
            <Card>
              <CardHeader>
                <CardTitle>Request Status Distribution</CardTitle>
                <CardDescription>
                  HTTP status codes in the last 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {dashboard.last24Hours.requests.requestsByStatus.map(
                    (item) => (
                      <div
                        key={item.statusCode}
                        className="flex items-center gap-2"
                      >
                        <Badge
                          variant={
                            item.statusCode < 400 ? "secondary" : "destructive"
                          }
                        >
                          {item.statusCode}
                        </Badge>
                        <span className="text-sm">{item.count} requests</span>
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Endpoints by Traffic</CardTitle>
              <CardDescription>Most accessed API endpoints</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Path</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Avg Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard?.last24Hours.requests.requestsByPath?.map(
                    (item, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">
                          {item.path}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.count}
                        </TableCell>
                        <TableCell className="text-right">
                          {Math.round(item.avgDuration)}ms
                        </TableCell>
                      </TableRow>
                    ),
                  ) || (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">
                        No request data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
            {/* Error by Severity */}
            <Card>
              <CardHeader>
                <CardTitle>Errors by Severity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboard?.last24Hours.errors.errorsBySeverity?.map(
                    (item) => (
                      <div
                        key={item.severity}
                        className="flex items-center justify-between"
                      >
                        {getSeverityBadge(item.severity)}
                        <span className="font-medium">{item.count}</span>
                      </div>
                    ),
                  ) || (
                    <p className="text-muted-foreground">No errors recorded</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Error by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Errors by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {dashboard?.last24Hours.errors.errorsByType?.map((item) => (
                    <div
                      key={item.type}
                      className="flex items-center justify-between"
                    >
                      <span className="font-mono text-sm">{item.type}</span>
                      <Badge variant="outline">{item.count}</Badge>
                    </div>
                  )) || (
                    <p className="text-muted-foreground">No errors recorded</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Errors */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
              <CardDescription>
                Latest error logs from the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Time</TableHead>
                    <TableHead className="w-[100px]">Severity</TableHead>
                    <TableHead className="w-[150px]">Type</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Path</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard?.last24Hours.errors.recentErrors?.map((error) => (
                    <TableRow key={error.id}>
                      <TableCell className="font-mono text-xs">
                        {format(new Date(error.createdAt), "MMM d, HH:mm:ss")}
                      </TableCell>
                      <TableCell>{getSeverityBadge(error.severity)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {error.type}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {error.message}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {error.path || "-"}
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        No recent errors
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          {/* Response Time Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Response Time Distribution</CardTitle>
              <CardDescription>
                Distribution of response times (last 7 days)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboard?.last7Days.performance.responseTimeDistribution?.map(
                  (item) => (
                    <div key={item.range} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.range}</span>
                        <span className="font-medium">{item.count}</span>
                      </div>
                      <Progress
                        value={Math.min(
                          (item.count /
                            Math.max(
                              ...dashboard.last7Days.performance.responseTimeDistribution.map(
                                (d) => d.count,
                              ),
                            )) *
                            100,
                          100,
                        )}
                        className="h-2"
                      />
                    </div>
                  ),
                ) || (
                  <p className="text-muted-foreground">
                    No performance data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Slowest Endpoints */}
          <Card>
            <CardHeader>
              <CardTitle>Slowest Endpoints</CardTitle>
              <CardDescription>
                Endpoints with highest average response time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Method</TableHead>
                    <TableHead>Path</TableHead>
                    <TableHead className="text-right">Avg</TableHead>
                    <TableHead className="text-right">Max</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dashboard?.last7Days.performance.slowestEndpoints?.map(
                    (item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <Badge variant="outline">{item.method}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.path}
                        </TableCell>
                        <TableCell className="text-right">
                          {Math.round(item.avgDuration)}ms
                        </TableCell>
                        <TableCell className="text-right">
                          {Math.round(item.maxDuration)}ms
                        </TableCell>
                        <TableCell className="text-right">
                          {item.count}
                        </TableCell>
                      </TableRow>
                    ),
                  ) || (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center">
                        No performance data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
