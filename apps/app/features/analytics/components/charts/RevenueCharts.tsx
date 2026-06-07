// jscpd:ignore-start
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Activity, DollarSign, type LucideIcon } from "lucide-react";
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
// jscpd:ignore-end
  data: RevenueByCPT[];
  loading: boolean;
}

function RevenueChartShell({
  title,
  description,
  data,
  loading,
  emptyIcon,
  emptyLabel,
  emptySublabel,
  children,
}: RevenueChartProps & {
  title: string;
  description: string;
  emptyIcon: LucideIcon;
  emptyLabel: string;
  emptySublabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="h-[400px]">
        {loading ? (
          <LoadingSpinner />
        ) : data.length > 0 ? (
          children
        ) : (
          <EmptyState
            icon={emptyIcon}
            label={emptyLabel}
            sublabel={emptySublabel}
          />
        )}
      </CardContent>
    </Card>
  );
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
