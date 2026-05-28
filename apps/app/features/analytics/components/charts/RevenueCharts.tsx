import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Activity, DollarSign } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RevenueByCPT } from "@/features/analytics/hooks/use-analytics-logic";
import { COLORS, EmptyState, LoadingSpinner } from "./chart-helpers";

interface RevenueChartProps {
  data: RevenueByCPT[];
  loading: boolean;
}

export const RevenueBarChart = ({ data, loading }: RevenueChartProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Revenue by Procedure Code</CardTitle>
      <CardDescription>Top revenue-generating procedures</CardDescription>
    </CardHeader>
    <CardContent className="h-[400px]">
      {loading ? (
        <LoadingSpinner />
      ) : data.length > 0 ? (
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
      ) : (
        <EmptyState
          icon={DollarSign}
          label="No revenue data available"
          sublabel="Start coding procedures to see revenue breakdown"
        />
      )}
    </CardContent>
  </Card>
);

export const RevenuePieChart = ({ data, loading }: RevenueChartProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Procedure volume</CardTitle>
      <CardDescription>Most frequently performed procedures</CardDescription>
    </CardHeader>
    <CardContent className="h-[400px]">
      {loading ? (
        <LoadingSpinner />
      ) : data.length > 0 ? (
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
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState
          icon={Activity}
          label="No procedure volume data available"
        />
      )}
    </CardContent>
  </Card>
);
