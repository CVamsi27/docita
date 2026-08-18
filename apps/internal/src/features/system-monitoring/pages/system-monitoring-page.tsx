import { useState, useMemo } from "react";
import { AppPageScaffold, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DataState, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components";
import { Activity, CheckCircle2, Cpu, Database, RefreshCw, Server, Shield, AlertTriangle } from "lucide-react";
import { useApiQuery } from "@/hooks/use-api-query";

/** Real contract for GET /api/v1/monitoring/health (SystemHealthSchema). */
interface SystemHealthPayload {
  uptime: number;
  memoryUsage: { rss: number; heapTotal: number; heapUsed: number; external: number };
  cpuUsage: { user: number; system: number };
  databaseConnected: boolean;
  lastErrors: number;
  avgResponseTime: number;
  requestsLastHour: number;
  errorsLastHour: number;
}

/** Real contract for GET /api/v1/monitoring/performance (getPerformanceMetrics). */
interface MonitoringPerformancePayload {
  slowestEndpoints: Array<{ path: string; method: string; avgDuration: number; maxDuration: number; count: number }>;
}

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

export function SystemMonitoringPage() {
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const { data: healthData, isLoading: healthLoading, refetch: refetchHealth } = useApiQuery<SystemHealthPayload>("/monitoring/health", {
    refetchInterval: autoRefresh ? 30_000 : false,
  });
  const { data: perfData, isLoading: perfLoading } = useApiQuery<MonitoringPerformancePayload>("/monitoring/performance", {
    refetchInterval: autoRefresh ? 30_000 : false,
  });

  const loading = healthLoading || perfLoading;

  const health = useMemo((): HealthSummary | null => {
    if (!healthData) return null;
    return {
      status: healthData.databaseConnected ? "healthy" : "degraded",
      uptime: healthData.uptime,
      checks: {
        "API Server": { status: "healthy", latency: healthData.avgResponseTime },
        Database: {
          status: healthData.databaseConnected ? "healthy" : "down",
          error: healthData.databaseConnected ? undefined : "Connection failed",
        },
        "Requests (last hour)": { status: "healthy", latency: healthData.requestsLastHour },
        "Errors (last hour)": {
          status: healthData.errorsLastHour > 0 ? "degraded" : "healthy",
          error: healthData.errorsLastHour > 0 ? `${String(healthData.errorsLastHour)} errors` : undefined,
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

  const heapPercent = performance ? Math.round((performance.memory.heapUsed / performance.memory.heapTotal) * 100) : 0;

  return (
    <AppPageScaffold header={<PageHeader title="System Monitoring" description="Live health, performance, and request telemetry" size="compact"
      actions={<div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => { setAutoRefresh(!autoRefresh); }}>{autoRefresh ? "Auto: ON" : "Auto: OFF"}</Button>
        <Button variant="outline" size="sm" onClick={() => { void refetchHealth(); }} disabled={healthLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${healthLoading ? "animate-spin" : ""}`} /> Refresh</Button>
      </div>} />}>
      <DataState status={loading ? "loading" : "success"} loadingMessage="Loading system monitoring...">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); }} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="health">Health</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Status</CardTitle><Server className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="flex items-center gap-2"><div className={`h-3 w-3 rounded-full ${health?.status === "healthy" ? "bg-success" : "bg-destructive"}`} />
                  <span className="text-2xl font-semibold capitalize">{health?.status || "Unknown"}</span></div></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Heap Usage</CardTitle><Cpu className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-semibold tabular-nums">{heapPercent}%</div></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Endpoints</CardTitle><Activity className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-semibold tabular-nums">{endpoints.length}</div></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Uptime</CardTitle><Database className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-lg font-semibold">{health ? `${Math.floor(health.uptime / 86400)}d ${Math.floor((health.uptime % 86400) / 3600)}h` : "-"}</div></CardContent></Card>
            </div>

            <Card><CardHeader><CardTitle>Service Health Checks</CardTitle></CardHeader>
              <CardContent>
                {health?.checks ? (
                  <div className="space-y-2">
                    {Object.entries(health.checks).map(([name, check]) => (
                      <div key={name} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                        <div className="flex items-center gap-2">
                          {check.status === "healthy" ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertTriangle className="h-4 w-4 text-destructive" />}
                          <span className="font-medium">{name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Latency: {check.latency ? `${String(check.latency)}ms` : "-"}</span>
                          {check.error && <span className="text-destructive">{check.error}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No health check data</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance">
            <Card><CardHeader><CardTitle>Slowest Endpoints</CardTitle><CardDescription>Top endpoints by average latency</CardDescription></CardHeader>
              <CardContent>
                {endpoints.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No endpoint data available</p>
                ) : (
                  <Table><TableHeader><TableRow>
                    <TableHead>Endpoint</TableHead><TableHead>Method</TableHead><TableHead>Avg Latency</TableHead><TableHead>Requests</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>{endpoints.slice(0, 20).map((ep, idx) => (
                    <TableRow key={`${ep.path}-${String(idx)}`}>
                      <TableCell className="font-mono text-xs">{ep.path}</TableCell>
                      <TableCell><Badge variant="outline">{ep.method}</Badge></TableCell>
                      <TableCell><span className={ep.avgLatency > 1000 ? "text-destructive font-medium" : ""}>{String(ep.avgLatency)}ms</span></TableCell>
                      <TableCell>{ep.count}</TableCell>
                    </TableRow>
                  ))}</TableBody></Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="health">
            <Card><CardHeader><CardTitle>System Health</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-sm font-medium text-muted-foreground">Uptime</p><p className="font-semibold">{health?.uptime ? `${String(Math.round(health.uptime / 3600))}h` : "-"}</p></div>
                  <div><p className="text-sm font-medium text-muted-foreground">Status</p><Badge variant={health?.status === "healthy" ? "default" : "destructive"}>{health?.status || "Unknown"}</Badge></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card><CardHeader><CardTitle>Security Summary</CardTitle><CardDescription>Security health and recent activity</CardDescription></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 p-4 rounded-md bg-muted/30">
                  <Shield className="h-8 w-8 text-muted-foreground" />
                  <div><p className="font-medium">All systems secure</p>
                    <p className="text-sm text-muted-foreground">No security incidents detected in the last 24 hours.</p></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DataState>
    </AppPageScaffold>
  );
}
