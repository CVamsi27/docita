import { Download } from "lucide-react";
import { Button, DataState } from "@workspace/ui/components";
import { MetricCardsGrid } from "./analytics-metric-cards";

interface AnalyticsDashboardProps {
  loading: boolean;
  error?: string;
  onRetry: () => void;
  metrics: { title: string; value: string; change?: string; trend?: "up" | "down" | "neutral" }[];
}

export function AnalyticsDashboard({ loading, error, onRetry, metrics }: AnalyticsDashboardProps) {
  return (
    <DataState status={loading ? "loading" : error ? "error" : "success"}
      loadingMessage="Loading analytics\u2026" errorMessage={error} onRetry={onRetry}>
      <div className="space-y-6">
        <div className="flex justify-end">
          <Button onClick={onRetry}><Download className="h-4 w-4 mr-2" /> Export Report</Button>
        </div>
        <MetricCardsGrid metrics={metrics.map((m) => ({ ...m, icon: <></> }))} />
      </div>
    </DataState>
  );
}
