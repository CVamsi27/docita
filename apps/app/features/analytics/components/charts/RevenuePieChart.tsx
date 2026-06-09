import { Activity } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { RevenueByCPT } from "@/features/analytics/hooks/use-analytics-logic";
import { RevenueChartShell } from "./RevenueChartShell";
import { COLORS } from "./chart-helpers";

interface RevenueChartProps {
  data: RevenueByCPT[];
  loading: boolean;
}

export const RevenuePieChart = ({ data, loading }: RevenueChartProps) => (
  <RevenueChartShell
    title="Procedure volume"
    description="Most frequently performed procedures"
    data={data}
    loading={loading}
    emptyIcon={Activity}
    emptyLabel="No procedure volume data available"
  >
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data.slice(0, 8)}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ payload }) => `${payload.code}: ${payload.count}`}
          outerRadius={120}
          fill="var(--color-chart-1)"
          dataKey="count"
        >
          {data.slice(0, 8).map((_entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  </RevenueChartShell>
);
