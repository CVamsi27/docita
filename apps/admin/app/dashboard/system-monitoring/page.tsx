"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { healthAPI, API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import {
  Activity,
  Server,
  Cpu,
  HardDrive,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Wifi,
} from "lucide-react";

interface HealthMetric {
  name: string;
  status: "healthy" | "warning" | "critical";
  value: string;
  description: string;
}

interface PerformanceData {
  uptime: string;
  responseTime: number;
  requestsPerMinute: number;
  errorRate: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
  healthChecks: HealthMetric[];
}

interface HealthCheckResult {
  status: string;
  timestamp?: string;
  checks?: {
    [key: string]: {
      status: string;
      latency?: number;
      error?: string;
      heapUsed?: number;
      heapTotal?: number;
      rss?: number;
      heapUsagePercent?: number;
      usedPercent?: number;
      totalGb?: number;
      usedGb?: number;
      path?: string;
      timestamp?: string;
    };
  };
}

export default function SystemMonitoringPage() {
  const [performanceData, setPerformanceData] =
    useState<PerformanceData | null>(null);
  const [health, setHealth] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { token } = useAuth();

  const fetchData = useCallback(async () => {
    if (!token) return;

    try {
      const [perfRes, healthData] = await Promise.all([
        fetch(`${API_URL}/super-admin/performance`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        healthAPI.getHealth(),
      ]);

      if (perfRes.ok) {
        const perfJson = await perfRes.json();
        setPerformanceData(perfJson);
      }
      setHealth(healthData);
    } catch (error) {
      console.error("Failed to fetch monitoring data", error);
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
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "unhealthy":
      case "critical":
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
      case "warning":
        return (
          <Badge className="bg-yellow-500/15 text-yellow-700 hover:bg-yellow-500/25 border-yellow-500/20">
            {status === "degraded" ? "Degraded" : "Warning"}
          </Badge>
        );
      case "unhealthy":
      case "critical":
        return (
          <Badge variant="destructive">
            {status === "unhealthy" ? "Unhealthy" : "Critical"}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
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
          <h1 className="text-3xl font-bold tracking-tight">
            System Monitoring
          </h1>
          <p className="text-muted-foreground">
            Real-time system performance and health metrics
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

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {performanceData && (
              <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Uptime
                    </CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {performanceData.uptime}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last 30 days
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
                      {performanceData.responseTime}ms
                    </div>
                    <p className="text-xs text-muted-foreground">P95 latency</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Requests/min
                    </CardTitle>
                    <Wifi className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {performanceData.requestsPerMinute.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Current throughput
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
                    <div className="text-2xl font-bold text-green-600">
                      {performanceData.errorRate}%
                    </div>
                    <p className="text-xs text-muted-foreground">Last hour</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Resource Usage */}
          {performanceData && (
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    CPU Usage
                  </CardTitle>
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-2xl font-bold">
                    {performanceData.cpuUsage}%
                  </div>
                  <Progress value={performanceData.cpuUsage} className="h-2" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Memory Usage
                  </CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-2xl font-bold">
                    {performanceData.memoryUsage}%
                  </div>
                  <Progress
                    value={performanceData.memoryUsage}
                    className="h-2"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Disk Usage
                  </CardTitle>
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-2xl font-bold">
                    {performanceData.diskUsage}%
                  </div>
                  <Progress value={performanceData.diskUsage} className="h-2" />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Health Summary */}
          {health && (
            <Card>
              <CardHeader>
                <CardTitle>Service Health Summary</CardTitle>
                <CardDescription>
                  Overall system status: {health.status}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {getStatusIcon(health.status)}
                  {getStatusBadge(health.status)}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {performanceData ? (
            <>
              {/* Key Metrics */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Uptime
                    </CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {performanceData.uptime}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last 30 days
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
                      {performanceData.responseTime}ms
                    </div>
                    <p className="text-xs text-muted-foreground">P95 latency</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Requests/min
                    </CardTitle>
                    <Wifi className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {performanceData.requestsPerMinute.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Current throughput
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
                    <div className="text-2xl font-bold text-green-600">
                      {performanceData.errorRate}%
                    </div>
                    <p className="text-xs text-muted-foreground">Last hour</p>
                  </CardContent>
                </Card>
              </div>

              {/* Resource Usage */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      CPU Usage
                    </CardTitle>
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-2xl font-bold">
                      {performanceData.cpuUsage}%
                    </div>
                    <Progress
                      value={performanceData.cpuUsage}
                      className="h-2"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Memory Usage
                    </CardTitle>
                    <Server className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-2xl font-bold">
                      {performanceData.memoryUsage}%
                    </div>
                    <Progress
                      value={performanceData.memoryUsage}
                      className="h-2"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Disk Usage
                    </CardTitle>
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-2xl font-bold">
                      {performanceData.diskUsage}%
                    </div>
                    <Progress
                      value={performanceData.diskUsage}
                      className="h-2"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Service Health */}
              <Card>
                <CardHeader>
                  <CardTitle>Service Health</CardTitle>
                  <CardDescription>
                    Status of all connected services and dependencies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {performanceData.healthChecks.map((check, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(check.status)}
                          <div>
                            <p className="font-medium">{check.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {check.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {check.value}
                          </span>
                          {getStatusBadge(check.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">
                  Unable to load performance data
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Health Checks Tab */}
        <TabsContent value="health" className="space-y-6">
          {health ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Overall System Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    {getStatusIcon(health.status)}
                    {getStatusBadge(health.status)}
                    <span className="text-muted-foreground ml-auto">
                      Last checked:{" "}
                      {health.timestamp
                        ? format(new Date(health.timestamp), "PPpp")
                        : "N/A"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {health.checks && (
                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Health Checks</CardTitle>
                    <CardDescription>
                      Individual service and component status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(health.checks).map(
                        ([serviceName, checkData]) => (
                          <div
                            key={serviceName}
                            className="flex items-center justify-between p-3 rounded-lg border"
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
                <p className="text-muted-foreground">
                  Unable to load health data
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
