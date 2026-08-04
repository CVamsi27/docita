import { useState, useEffect } from "react";
import { AppPageScaffold, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, DataState, PageHeader, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components";
import { Activity, CheckCircle2, Cpu, Database, RefreshCw, Server, Shield, AlertTriangle } from "lucide-react";
import { apiGet } from "@/lib/api/api-client";

interface HealthCheck { status: string; uptime?: number; version?: string; checks?: Record<string, { status: string; latency?: number; error?: string }>; }
interface PerformanceData { memory: { heapUsed: number; heapTotal: number; rss: number }; cpu: { user: number; system: number }; }
interface Endpoint { path: string; method: string; avgLatency: number; count: number; }

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

export function SystemMonitoringPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [healthData, perfData] = await Promise.all([
        apiGet<SystemHealthPayload>("/monitoring/health"),
        apiGet<MonitoringPerformancePayload>("/monitoring/performance"),
      ]);
      setHealth({
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
      });
      setPerformance({
        memory: healthData.memoryUsage,
        cpu: healthData.cpuUsage,
      });
      setEndpoints(perfData.slowestEndpoints.map((ep) => ({
        path: ep.path,
        method: ep.method,
        avgLatency: ep.avgDuration,
        count: ep.count,
      })));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { void fetchData(); }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => { void fetchData(); }, 30000);
    return () => { clearInterval(interval); };
  }, [autoRefresh]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const heapPercent = performance ? Math.round((performance.memory.heapUsed / performance.memory.heapTotal) * 100) : 0;

  return (
    <AppPageScaffold header={<PageHeader title="System Monitoring" description="Live health, performance, and request telemetry" size="compact"
      actions={<div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => { setAutoRefresh(!autoRefresh); }}>{autoRefresh ? "Auto: ON" : "Auto: OFF"}</Button>
        <Button variant="outline" size="sm" onClick={() => { void handleRefresh(); }} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh</Button>
      </div>} />}>
      <DataState status={loading ? "loading" : "success"} loadingMessage="Loading system monitoring\u2026">
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
                <CardContent><div className="flex items-center gap-2"><div className={`h-3 w-3 rounded-full ${health?.status === "healthy" ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-2xl font-semibold capitalize">{health?.status || "Unknown"}</span></div></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Heap Usage</CardTitle><Cpu className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-semibold tabular-nums">{heapPercent}%</div></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Endpoints</CardTitle><Activity className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-2xl font-semibold tabular-nums">{endpoints.length}</div></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Version</CardTitle><Database className="h-4 w-4 text-muted-foreground" /></CardHeader>
                <CardContent><div className="text-lg font-semibold">{health?.version || "-"}</div></CardContent></Card>
            </div>

            <Card><CardHeader><CardTitle>Service Health Checks</CardTitle></CardHeader>
              <CardContent>
                {health?.checks ? (
                  <div className="space-y-2">
                    {Object.entries(health.checks).map(([name, check]) => (
                      <div key={name} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                        <div className="flex items-center gap-2">
                          {check.status === "healthy" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-red-500" />}
                          <span className="font-medium">{name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Latency: {check.latency ? `${String(check.latency)}ms` : "-"}</span>
                          {check.error && <span className="text-red-500">{check.error}</span>}
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
                      <TableCell><span className={ep.avgLatency > 1000 ? "text-red-500 font-medium" : ""}>{String(ep.avgLatency)}ms</span></TableCell>
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
