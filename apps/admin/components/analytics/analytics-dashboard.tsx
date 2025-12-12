"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Download,
  Calendar,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Loader2,
} from "lucide-react";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

interface MetricCard {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
}

interface AnalyticsData {
  revenue: number;
  appointments: number;
  newPatients: number;
  avgInvoiceValue: number;
  revenueChange?: number;
  appointmentsChange?: number;
  patientsChange?: number;
  invoiceValueChange?: number;
  detailedMetrics?: Array<{
    period: string;
    revenue: number;
    invoices: number;
    avgAmount: number;
    appointments: number;
    fillRate: number;
  }>;
}

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">(
    "monthly",
  );
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const { token } = useAuth();

  const fetchAnalytics = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("period", period);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(
        `${API_URL}/super-admin/analytics?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        const analyticsData = await res.json();
        setData(analyticsData);
      } else {
        console.error("Failed to fetch analytics data:", res.status);
      }
    } catch (error) {
      console.error("Failed to fetch analytics", error);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [token, period, startDate, endDate]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExport = async () => {
    if (!token) return;

    try {
      const params = new URLSearchParams();
      params.append("period", period);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      params.append("format", "pdf");

      const res = await fetch(
        `${API_URL}/super-admin/analytics/export?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `analytics-report-${new Date().toISOString().split("T")[0]}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success("Report exported successfully");
      } else {
        toast.error("Failed to export report");
      }
    } catch (error) {
      console.error("Failed to export", error);
      toast.error("Failed to export report");
    }
  };

  const metrics: MetricCard[] = [
    {
      title: "Total Revenue",
      value: data ? `$${(data.revenue / 1000).toFixed(1)}K` : "$0",
      change: data?.revenueChange
        ? `${data.revenueChange > 0 ? "+" : ""}${data.revenueChange.toFixed(1)}%`
        : undefined,
      icon: <DollarSign className="h-6 w-6" />,
      trend:
        data?.revenueChange && data.revenueChange > 0
          ? "up"
          : data?.revenueChange && data.revenueChange < 0
            ? "down"
            : "neutral",
    },
    {
      title: "Appointments",
      value: data?.appointments || 0,
      change: data?.appointmentsChange
        ? `${data.appointmentsChange > 0 ? "+" : ""}${data.appointmentsChange.toFixed(1)}%`
        : undefined,
      icon: <Activity className="h-6 w-6" />,
      trend:
        data?.appointmentsChange && data.appointmentsChange > 0
          ? "up"
          : data?.appointmentsChange && data.appointmentsChange < 0
            ? "down"
            : "neutral",
    },
    {
      title: "New Patients",
      value: data?.newPatients || 0,
      change: data?.patientsChange
        ? `${data.patientsChange > 0 ? "+" : ""}${data.patientsChange.toFixed(1)}%`
        : undefined,
      icon: <Users className="h-6 w-6" />,
      trend:
        data?.patientsChange && data.patientsChange > 0
          ? "up"
          : data?.patientsChange && data.patientsChange < 0
            ? "down"
            : "neutral",
    },
    {
      title: "Avg Invoice Value",
      value: data ? `$${data.avgInvoiceValue.toFixed(2)}` : "$0.00",
      change: data?.invoiceValueChange
        ? `${data.invoiceValueChange > 0 ? "+" : ""}${data.invoiceValueChange.toFixed(1)}%`
        : undefined,
      icon: <TrendingUp className="h-6 w-6" />,
      trend:
        data?.invoiceValueChange && data.invoiceValueChange > 0
          ? "up"
          : data?.invoiceValueChange && data.invoiceValueChange < 0
            ? "down"
            : "neutral",
    },
  ];

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">
            Real-time clinic performance metrics
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>

      <div className="bg-background rounded-lg border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {(["daily", "weekly", "monthly"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                    period === p
                      ? "bg-primary text-primary-foreground"
                      : "bg-accent text-accent-foreground hover:bg-accent/80"
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
                placeholder="Start date"
              />
            </div>
            <span className="text-muted-foreground">to</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
                placeholder="End date"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, idx) => (
          <div
            key={idx}
            className="bg-background rounded-lg border border-border p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-muted-foreground font-medium">
                {metric.title}
              </h3>
              <div className="text-muted-foreground">{metric.icon}</div>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-foreground">
                {metric.value}
              </p>
              {metric.change && (
                <p
                  className={`text-sm font-medium ${
                    metric.trend === "up"
                      ? "text-green-600 dark:text-green-400"
                      : metric.trend === "down"
                        ? "text-red-600 dark:text-red-400"
                        : "text-muted-foreground"
                  }`}
                >
                  {metric.trend === "up"
                    ? "↑"
                    : metric.trend === "down"
                      ? "↓"
                      : "→"}{" "}
                  {metric.change} from last period
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {data?.revenue ? (
          <div className="bg-background rounded-lg border border-border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Revenue Trend
            </h2>
            <div className="h-64 bg-accent rounded-lg border border-border flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">Revenue chart implementation pending</p>
                <p className="text-xs mt-2">
                  Current revenue: ${(data.revenue / 1000).toFixed(1)}K
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {data?.appointments ? (
          <div className="bg-background rounded-lg border border-border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Appointment Metrics
            </h2>
            <div className="h-64 bg-accent rounded-lg border border-border flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">Appointment breakdown chart pending</p>
                <p className="text-xs mt-2">
                  Total appointments: {data.appointments}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {data?.newPatients ? (
          <div className="bg-background rounded-lg border border-border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Patient Demographics
            </h2>
            <div className="h-64 bg-accent rounded-lg border border-border flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">
                  Demographics chart implementation pending
                </p>
                <p className="text-xs mt-2">New patients: {data.newPatients}</p>
              </div>
            </div>
          </div>
        ) : null}

        {data?.appointments ? (
          <div className="bg-background rounded-lg border border-border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Top Conditions
            </h2>
            <div className="h-64 bg-accent rounded-lg border border-border flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">
                  Conditions chart implementation pending
                </p>
                <p className="text-xs mt-2">Chart data available from API</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="bg-background rounded-lg border border-border p-6 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Detailed Metrics
        </h2>
        {data?.detailedMetrics && data.detailedMetrics.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-foreground">
                    Period
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-foreground">
                    Revenue
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-foreground">
                    Invoices
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-foreground">
                    Avg Amount
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-foreground">
                    Appointments
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-foreground">
                    Fill Rate
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.detailedMetrics.map((row, idx) => (
                  <tr key={idx} className="hover:bg-accent">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {row.period}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground">
                      ${row.revenue.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {row.invoices}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      ${row.avgAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {row.appointments}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          row.fillRate >= 80
                            ? "bg-green-500/10 text-green-600 dark:text-green-400"
                            : row.fillRate >= 60
                              ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                              : "bg-red-500/10 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {row.fillRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>No detailed metrics available</p>
          </div>
        )}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm text-blue-600 dark:text-blue-400">
        💡 Tip: All metrics are fetched from the API based on your selected
        period and date range. The detailed metrics table shows actual clinic
        performance data. Charts will be implemented using the available API
        data.
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
