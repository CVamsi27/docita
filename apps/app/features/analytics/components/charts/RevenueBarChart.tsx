// jscpd:ignore-start
import { DollarSign } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RevenueByCPT } from "@/features/analytics/hooks/use-analytics-logic";
import { RevenueChartShell } from "./RevenueChartShell";

interface RevenueChartProps {
  data: RevenueByCPT[];
  loading: boolean;
}

export const RevenueBarChart = ({ data, loading }: RevenueChartProps) => (
  <RevenueChartShell
    title="Revenue by Procedure Code"
    description="Top revenue-generating procedures"
    data={data}
    loading={loading}
    emptyIcon={DollarSign}
    emptyLabel="No revenue data available"
    emptySublabel="Start coding procedures to see revenue breakdown"
  >
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data.slice(0, 10)}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="code" angle={-45} textAnchor="end" height={100} />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="revenue" fill="var(--color-chart-2)" name="Revenue" />
      </BarChart>
    </ResponsiveContainer>
  </RevenueChartShell>
);
// jscpd:ignore-end
