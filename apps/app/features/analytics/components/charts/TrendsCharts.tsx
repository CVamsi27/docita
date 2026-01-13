import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Activity } from "lucide-react";
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
import type { DiseaseTrend } from "../../hooks/use-analytics-logic";
import { LoadingSpinner, EmptyState, COLORS } from "./chart-helpers";

interface TrendsChartProps {
  data: DiseaseTrend[];
  loading: boolean;
}

export const TrendsBarChart = ({ data, loading }: TrendsChartProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Top Diagnoses by ICD Code</CardTitle>
      <CardDescription>Most common diagnoses in your clinic</CardDescription>
    </CardHeader>
    <CardContent className="h-[400px]">
      {loading ? (
        <LoadingSpinner />
      ) : data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data.slice(0, 10)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="disease"
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#8884d8" name="Patient Count" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState
          icon={Activity}
          label="No disease trend data available"
          sublabel="Start coding diagnoses to see trends"
        />
      )}
    </CardContent>
  </Card>
);

export const TrendsPieChart = ({ data, loading }: TrendsChartProps) => (
  <Card>
    <CardHeader>
      <CardTitle>Disease Distribution</CardTitle>
      <CardDescription>Percentage breakdown of diagnoses</CardDescription>
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
              label={({ payload }) =>
                `${payload.disease}: ${payload.percentage}%`
              }
              outerRadius={120}
              fill="#8884d8"
              dataKey="count"
            >
              {data.slice(0, 8).map((_entry, index: number) => (
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
        <EmptyState icon={Activity} label="No distribution data available" />
      )}
    </CardContent>
  </Card>
);
