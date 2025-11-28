"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@workspace/ui/components/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

interface ChartData {
  name: string;
  value: number;
}

interface PerformanceData {
  uptime: string;
  responseTime: number;
  requestsPerMinute: number;
  errorRate: number;
  activeConnections: number;
  memoryUsage: number;
  cpuUsage: number;
  diskUsage: number;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<"week" | "month" | "year">("month");
  const [data, setData] = useState<ChartData[]>([]);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const fetchData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };

      const [analyticsRes, performanceRes] = await Promise.all([
        fetch(`${API_URL}/super-admin/analytics?period=${period}`, { headers }),
        fetch(`${API_URL}/super-admin/performance`, { headers }),
      ]);

      if (analyticsRes.ok) {
        const json = await analyticsRes.json();
        const chartData = json.labels.map((label: string, index: number) => ({
          name: label,
          value: json.datasets[0].data[index],
        }));
        setData(chartData);
      }

      if (performanceRes.ok) {
        setPerformance(await performanceRes.json());
      }
    } catch (error) {
      console.error("Failed to fetch analytics", error);
    } finally {
      setLoading(false);
    }
  }, [token, period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Overview of system performance and user activity.
        </p>
      </div>

      <Tabs
        defaultValue="month"
        className="space-y-4"
        onValueChange={(v) => setPeriod(v as "week" | "month" | "year")}
      >
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={period} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Active Users</CardTitle>
                <CardDescription>
                  User activity over the selected period.
                </CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <div className="h-[350px] w-full">
                  {loading ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      Loading...
                    </div>
                  ) : data.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      No data available
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={data} key={`chart-${period}`}>
                        <defs>
                          <linearGradient
                            id="colorValue"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#8884d8"
                              stopOpacity={0.8}
                            />
                            <stop
                              offset="95%"
                              stopColor="#8884d8"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis
                          dataKey="name"
                          stroke="#888888"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#888888"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `${value}`}
                        />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#8884d8"
                          fillOpacity={1}
                          fill="url(#colorValue)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>System Health</CardTitle>
                <CardDescription>
                  Current system status and performance metrics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex h-full items-center justify-center text-muted-foreground py-8">
                    Loading...
                  </div>
                ) : (
                  <div className="space-y-8">
                    <div className="flex items-center">
                      <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          API Latency
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Average response time
                        </p>
                      </div>
                      <div className="ml-auto font-medium">
                        {performance?.responseTime ?? 0}ms
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          Error Rate
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Last 24 hours
                        </p>
                      </div>
                      <div
                        className={`ml-auto font-medium ${(performance?.errorRate ?? 0) < 1 ? "text-green-500" : (performance?.errorRate ?? 0) < 5 ? "text-yellow-500" : "text-red-500"}`}
                      >
                        {performance?.errorRate ?? 0}%
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          Memory Usage
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Heap utilization
                        </p>
                      </div>
                      <div className="ml-auto font-medium">
                        {performance?.memoryUsage ?? 0}%
                      </div>
                    </div>
                    <div className="flex items-center">
                      <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium leading-none">
                          Active Clinics
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Connected clients
                        </p>
                      </div>
                      <div className="ml-auto font-medium">
                        {performance?.activeConnections ?? 0}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
