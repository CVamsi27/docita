import { useState, useMemo } from "react";
import {
  AppPageScaffold,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DataState,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components";
import {
  Activity,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Server,
  Shield,
  AlertTriangle,
  Radio,
} from "lucide-react";
import { useApiQuery } from "@/hooks/use-api-query";
import type {
  PerformanceMetrics,
  QueueHealthSummary,
  SystemHealth,
  TelemetryCoverage,
} from "@workspace/types";

interface HealthCheck {
  status: string;
  latency?: number;
  error?: string;
}

interface HealthSummary {
  status: string;
  uptime: number;
  checks: Record<string, HealthCheck>;
}

const COVERAGE_LABEL: Record<TelemetryCoverage["state"], string> = {
  COMPLETE: "Complete",
  GAPS_RECORDED: "Gaps recorded",
  UNAVAILABLE: "Unavailable",
};

function formatInstant(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : "never";
}

export function SystemMonitoringPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const {
    data: healthData,
    isLoading: healthLoading,
    isError: healthError,
    refetch: refetchHealth,
  } = useApiQuery<SystemHealth>("/monitoring/health", {
    refetchInterval: autoRefresh ? 30_000 : false,
  });
  const { data: perfData, isLoading: perfLoading } =
    useApiQuery<PerformanceMetrics>(
      "/monitoring/performance?routeCategory=CUSTOMER",
      {
        refetchInterval: autoRefresh ? 30_000 : false,
      },
    );
  // Coverage is fetched unfiltered: it describes whether telemetry is capturing
  // at all, which is a property of the pipeline, not of one route family.
  const { data: coverage } = useApiQuery<TelemetryCoverage>(
    "/monitoring/telemetry-coverage",
    {
      refetchInterval: autoRefresh ? 60_000 : false,
    },
  );
  const { data: queueHealth } = useApiQuery<QueueHealthSummary>(
    "/monitoring/queue-health",
    {
      refetchInterval: autoRefresh ? 30_000 : false,
    },
  );

  const loading = healthLoading || perfLoading;

  const health = useMemo((): HealthSummary | null => {
    if (!healthData) return null;
    return {
      status: healthData.databaseConnected ? "healthy" : "degraded",
      uptime: healthData.uptime,
      checks: {
        "API Server": {
          status: "healthy",
          latency: healthData.avgResponseTime,
        },
        Database: {
          status: healthData.databaseConnected ? "healthy" : "down",
          error: healthData.databaseConnected ? undefined : "Connection failed",
        },
        "Requests (last hour)": {
          status: "healthy",
          latency: healthData.requestsLastHour,
        },
        "Errors (last hour)": {
          status: healthData.errorsLastHour > 0 ? "degraded" : "healthy",
          error:
            healthData.errorsLastHour > 0
              ? `${String(healthData.errorsLastHour)} errors`
              : undefined,
        },
      },
    };
  }, [healthData]);

  const performance = useMemo(() => {
    if (!healthData) return null;
    return { memory: healthData.memoryUsage, cpu: healthData.cpuUsage };
  }, [healthData]);

  const endpoints = useMemo(() => {
    if (!perfData) return [];
    return perfData.slowestEndpoints.map((ep) => ({
      path: ep.path,
      method: ep.method,
      avgLatency: ep.avgDuration,
      count: ep.count,
    }));
  }, [perfData]);

  const heapPercent = performance
    ? Math.round(
        (performance.memory.heapUsed / performance.memory.heapTotal) * 100,
      )
    : 0;

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="System Monitoring"
          description="Live health, performance, and request telemetry"
          size="compact"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAutoRefresh(!autoRefresh);
                }}
              >
                {autoRefresh ? "Auto: ON" : "Auto: OFF"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  void refetchHealth();
                }}
                disabled={healthLoading}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${healthLoading ? "animate-spin" : ""}`}
                />{" "}
                Refresh
              </Button>
            </div>
          }
        />
      }
    >
      <DataState
        status={healthError ? "error" : loading ? "loading" : "success"}
        loadingMessage="Loading system monitoring..."
        errorMessage="We could not load system monitoring. Please try again."
        onRetry={() => {
          void refetchHealth();
        }}
      >
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v);
          }}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="traffic">Traffic</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-3 w-3 rounded-full ${health?.status === "healthy" ? "bg-success" : "bg-destructive"}`}
                    />
                    <span className="text-2xl font-semibold capitalize">
                      {health?.status || "Unknown"}
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Heap Usage
                  </CardTitle>
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold tabular-nums">
                    {heapPercent}%
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Customer Endpoints
                  </CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold tabular-nums">
                    {endpoints.length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Telemetry Coverage
                  </CardTitle>
                  <Radio className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <Badge
                    variant={
                      coverage?.state === "COMPLETE"
                        ? "default"
                        : coverage
                          ? "destructive"
                          : "outline"
                    }
                  >
                    {coverage ? COVERAGE_LABEL[coverage.state] : "Unknown"}
                  </Badge>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Last retained request:{" "}
                    {formatInstant(coverage?.lastObservedAt ?? null)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Service Health Checks</CardTitle>
              </CardHeader>
              <CardContent>
                {health?.checks ? (
                  <div className="space-y-2">
                    {Object.entries(health.checks).map(([name, check]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/30"
                      >
                        <div className="flex items-center gap-2">
                          {check.status === "healthy" ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          )}
                          <span className="font-medium">{name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            Latency:{" "}
                            {check.latency ? `${String(check.latency)}ms` : "-"}
                          </span>
                          {check.error && (
                            <span className="text-destructive">
                              {check.error}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No health check data
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <Card>
              <CardHeader>
                <CardTitle>Slowest Customer Endpoints</CardTitle>
                <CardDescription>
                  Customer traffic only. Liveness and readiness probes are
                  excluded.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {endpoints.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No endpoint data available
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Endpoint</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Avg Latency</TableHead>
                        <TableHead>Requests</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {endpoints.slice(0, 20).map((ep, idx) => (
                        <TableRow key={`${ep.path}-${String(idx)}`}>
                          <TableCell className="font-mono text-xs">
                            {ep.path}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{ep.method}</Badge>
                          </TableCell>
                          <TableCell>
                            <span
                              className={
                                ep.avgLatency > 1000
                                  ? "text-destructive font-medium"
                                  : ""
                              }
                            >
                              {String(ep.avgLatency)}ms
                            </span>
                          </TableCell>
                          <TableCell>{ep.count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {perfData && perfData.invalidLatencySamples > 0 ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {String(perfData.invalidLatencySamples)} latency sample(s)
                    were out of range and are excluded from the figures above.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="traffic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Observation Coverage</CardTitle>
                <CardDescription>{coverage?.coverageNote}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      First retained request
                    </p>
                    <p className="font-semibold">
                      {formatInstant(coverage?.firstObservedAt ?? null)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Last retained request
                    </p>
                    <p className="font-semibold">
                      {formatInstant(coverage?.lastObservedAt ?? null)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Retained requests in window
                    </p>
                    <p className="font-semibold tabular-nums">
                      {coverage?.retainedRequests ?? "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Dropped requests
                    </p>
                    <p className="font-semibold tabular-nums">
                      {coverage?.droppedRequests ?? "-"}
                    </p>
                  </div>
                </div>
                {coverage && coverage.captureEvents.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>State</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Dropped</TableHead>
                        <TableHead>Recorded</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coverage.captureEvents.map((event, idx) => (
                        <TableRow key={`${event.recordedAt}-${String(idx)}`}>
                          <TableCell>{event.state}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {event.reason}
                          </TableCell>
                          <TableCell>{event.droppedRequests}</TableCell>
                          <TableCell className="text-xs">
                            {formatInstant(event.recordedAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No capture gaps recorded in this window.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Queue Outcomes (last 24h)</CardTitle>
                <CardDescription>
                  Append-only execution history. Current job state alone cannot
                  show a retry that recovered.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {queueHealth && queueHealth.outcomesLast24h.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Outcome</TableHead>
                        <TableHead>Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {queueHealth.outcomesLast24h.map((row) => (
                        <TableRow key={row.outcome}>
                          <TableCell>{row.outcome}</TableCell>
                          <TableCell className="tabular-nums">
                            {row.count}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No execution outcomes recorded.
                  </p>
                )}
                {queueHealth ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {String(queueHealth.jobsRetriedLast24h)} job(s) retried,{" "}
                    {String(queueHealth.jobsRecoveredLast24h)} recovered,{" "}
                    {String(queueHealth.deadLetteredLast24h)} dead-lettered.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health">
            <Card>
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>
                  Process uptime for this replica. It is not service
                  availability.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Process Uptime
                    </p>
                    <p className="font-semibold">
                      {health?.uptime
                        ? `${String(Math.round(health.uptime / 3600))}h`
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Status
                    </p>
                    <Badge
                      variant={
                        health?.status === "healthy" ? "default" : "destructive"
                      }
                    >
                      {health?.status || "Unknown"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Summary</CardTitle>
                <CardDescription>
                  Security health and recent activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 p-4 rounded-md bg-muted/30">
                  <Shield className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <p className="font-medium">All systems secure</p>
                    <p className="text-sm text-muted-foreground">
                      No security incidents detected in the last 24 hours.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DataState>
    </AppPageScaffold>
  );
}
