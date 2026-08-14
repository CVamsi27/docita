import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/indicators/card";
import { Activity, AlertCircle, CheckCircle2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ComplianceMetric } from "@/features/analytics/hooks/use-analytics-logic";
import { LoadingSpinner } from "./chart-helpers";

interface ComplianceDashboardProps {
  metrics: ComplianceMetric[];
  loading: boolean;
}

export const ComplianceDashboard = ({
  metrics,
  loading,
}: ComplianceDashboardProps) => (
  <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-3">
      {loading ? (
        <LoadingSpinner className="col-span-3 h-64" />
      ) : metrics.length > 0 ? (
        metrics.map((metric, index: number) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.metric}
              </CardTitle>
              {metric.status === "good" || metric.status === "compliant" ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <AlertCircle className="h-4 w-4 text-warning" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                {metric.value || metric.score}%
              </div>
              <p className="text-xs text-muted-foreground">
                {metric.status === "good" || metric.status === "compliant"
                  ? "Meeting standards"
                  : "Needs improvement"}
              </p>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card className="col-span-3">
          <CardContent className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Activity className="h-12 w-12 mb-4 opacity-50" />
            <p>No compliance data available</p>
            <p className="text-sm">
              Compliance metrics will appear once you code visits
            </p>
          </CardContent>
        </Card>
      )}
    </div>

    {!loading && metrics.length > 0 && (
      <Card>
        <CardHeader>
          <CardTitle>Compliance Metrics Overview</CardTitle>
          <CardDescription>
            Coding quality and timeliness metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="metric" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="var(--color-chart-1)" name="Compliance %" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    )}
  </div>
);
