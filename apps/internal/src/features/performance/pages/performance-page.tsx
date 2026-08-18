import { useMemo } from "react";
import { AppPageScaffold, Card, CardContent, CardHeader, CardTitle, DataState, PageHeader, Button } from "@workspace/ui/components";
import { Activity, ArrowDown, ArrowUp, Cpu, Minus, RefreshCw, Server } from "lucide-react";
import { useApiQuery } from "@/hooks/use-api-query";

/** Real contract for GET /api/v1/internal/performance (getPerformanceMetrics). */
interface PerformanceMetricsPayload {
  uptimeSeconds: number;
  uptimeFormatted: string;
  avgResponseTime: number;
  requestsPerMinute: number;
  errorsLastHour: number;
  errorRate: number;
  databaseConnected: boolean;
}

export function PerformancePage() {
  const { data: perfData, isLoading, refetch } = useApiQuery<PerformanceMetricsPayload>("/api/internal/performance");

  const metrics = useMemo(() => {
    if (!perfData) return [];
    return [
      { name: "Avg Response Time", value: String(perfData.avgResponseTime), change: 0, unit: "ms" },
      { name: "Requests/min", value: String(perfData.requestsPerMinute), change: 0, unit: "" },
      { name: "Error Rate", value: String(perfData.errorRate), change: 0, unit: "%" },
      { name: "Uptime", value: perfData.uptimeFormatted, change: 0, unit: "" },
      { name: "Errors (last hour)", value: String(perfData.errorsLastHour), change: 0, unit: "" },
    ];
  }, [perfData]);

  return (
    <AppPageScaffold header={<PageHeader title="Performance" description="Application performance metrics and benchmarks"
      actions={<Button variant="outline" size="sm" onClick={() => { void refetch(); }} disabled={isLoading}>
        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh</Button>} />}>
      <DataState status={isLoading ? "loading" : "success"} loadingMessage="Loading performance metrics…">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {metrics.length === 0 ? (
            <>
              <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Avg Response Time</CardTitle><Activity className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-semibold tabular-nums">-</div></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Requests/min</CardTitle><Server className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-semibold tabular-nums">-</div></CardContent></Card>
              <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Error Rate</CardTitle><Cpu className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-semibold tabular-nums">-</div></CardContent></Card>
            </>
          ) : metrics.map((metric, idx) => (
            <Card key={idx}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                {metric.change > 0 ? <ArrowUp className="h-4 w-4 text-success" /> : metric.change < 0 ? <ArrowDown className="h-4 w-4 text-destructive" /> : <Minus className="h-4 w-4 text-muted-foreground" />}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold tabular-nums">{metric.value} {metric.unit}</div>
                <p className={`text-xs mt-1 ${metric.change > 0 ? "text-success" : metric.change < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                  {metric.change > 0 ? "+" : ""}{String(metric.change)}% from baseline
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </DataState>
    </AppPageScaffold>
  );
}
