"use client";

import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  BarChart3,
  Calendar,
  DollarSign,
  Download,
  Loader2,
  TrendingUp,
  Users,
} from "lucide-react";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { client } from "@/lib/api-client";
import { internalQueryKeys } from "@/lib/query-keys";
import type { DetailedMetricsRow } from "@/components/analytics/analytics-detailed-metrics-table";

const AnalyticsDetailedMetricsTable = dynamic(
  () =>
    import("@/components/analytics/analytics-detailed-metrics-table").then(
      (module) => module.AnalyticsDetailedMetricsTable,
    ),
  {
    loading: () => (
      <div className="text-center text-muted-foreground py-8">
        <p>Loading detailed metrics...</p>
      </div>
    ),
    ssr: false,
  },
);

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
  detailedMetrics?: DetailedMetricsRow[];
}

interface BillingMetrics {
  mrr: number;
  arr: number;
  churnRate: number;
  activeSubscriptions: number;
  revenueByMonth: { month: string; revenue: number }[];
  subscriptionsByTier: Record<string, number>;
}

const tierColors: Record<string, string> = {
  CAPTURE: "bg-muted",
  CORE: "bg-info",
  PLUS: "bg-success",
  PRO: "bg-primary",
  CLINIC: "bg-processing",
  ENTERPRISE: "bg-warning",
};

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">(
    "monthly",
  );
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const { token } = useAuth();
  const analyticsParams = useMemo(() => {
    const params = new URLSearchParams({ period });
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    return params.toString();
  }, [endDate, period, startDate]);

  const analyticsQuery = useQuery({
    queryKey: internalQueryKeys.internal.analytics(analyticsParams),
    queryFn: () =>
      client.get<AnalyticsData>(`/internal/analytics?${analyticsParams}`),
    enabled: Boolean(token),
  });

  const billingQuery = useQuery({
    queryKey: internalQueryKeys.internal.billingMetrics(),
    queryFn: () => client.get<BillingMetrics>("/internal/billing/metrics"),
    enabled: Boolean(token),
  });

  const data = analyticsQuery.data ?? null;
  const billing = billingQuery.data ?? null;
  const loading = analyticsQuery.isLoading || billingQuery.isLoading;

  useEffect(() => {
    if (analyticsQuery.isError || billingQuery.isError) {
      toast.error("Failed to load analytics data");
    }
  }, [analyticsQuery.isError, billingQuery.isError]);

  const handleExport = useCallback(async () => {
    if (!token) return;

    try {
      const params = new URLSearchParams({ period, format: "pdf" });
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(
        `${API_URL}/internal/analytics/export?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } },
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
    } catch {
      toast.error("Failed to export report");
    }
  }, [endDate, period, startDate, token]);

  const formatCurrency = useCallback((amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
    return `₹${amount.toFixed(0)}`;
  }, []);

  const metrics = useMemo<MetricCard[]>(
    () => [
      {
        title: "Total Revenue",
        value: data ? `₹${((data.revenue || 0) / 1000).toFixed(1)}K` : "₹0",
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
        value: data ? `₹${(data.avgInvoiceValue || 0).toFixed(2)}` : "₹0.00",
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
    ],
    [data],
  );

  const tierEntries = useMemo(
    () =>
      billing?.subscriptionsByTier
        ? Object.entries(billing.subscriptionsByTier).sort(
            (a, b) => b[1] - a[1],
          )
        : [],
    [billing?.subscriptionsByTier],
  );
  const totalTierCount = useMemo(
    () => tierEntries.reduce((sum, [, value]) => sum + value, 0),
    [tierEntries],
  );

  const revenueByMonth = useMemo(
    () => billing?.revenueByMonth || [],
    [billing?.revenueByMonth],
  );
  const maxRevenue = useMemo(
    () => Math.max(...revenueByMonth.map((row) => row.revenue), 1),
    [revenueByMonth],
  );

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

      {billing && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-background rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground font-medium">
                MRR
              </span>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(billing.mrr)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ARR: {formatCurrency(billing.arr)}
            </p>
          </div>
          <div className="bg-background rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground font-medium">
                Active Subscriptions
              </span>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {billing.activeSubscriptions}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Churn rate: {(billing.churnRate * 100).toFixed(1)}% (30d)
            </p>
          </div>
          <div className="bg-background rounded-lg border border-border p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground font-medium">
                Tier Distribution
              </span>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-1.5">
              {tierEntries.map(([tier, count]) => (
                <div key={tier} className="flex items-center gap-2">
                  <span className="w-16 text-xs text-muted-foreground truncate">
                    {tier}
                  </span>
                  <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${tierColors[tier] || "bg-primary"}`}
                      style={{
                        width: `${totalTierCount > 0 ? (count / totalTierCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="w-6 text-xs text-right font-medium text-foreground">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-background rounded-lg border border-border p-4 space-y-4">
        <div className="flex items-center justify-between">
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

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
              />
            </div>
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
            />
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
                      ? "text-success"
                      : metric.trend === "down"
                        ? "text-destructive"
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
        {revenueByMonth.length > 0 && (
          <div className="bg-background rounded-lg border border-border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              MRR Trend (6 months)
            </h2>
            <div className="flex items-end gap-2 h-40">
              {revenueByMonth.map((item) => (
                <div
                  key={item.month}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-full bg-primary rounded-t-sm min-h-[4px]"
                    style={{
                      height: `${Math.round((item.revenue / maxRevenue) * 100)}%`,
                    }}
                    title={`${item.month}: ₹${item.revenue.toLocaleString()}`}
                  />
                  <span className="text-xs text-muted-foreground truncate w-full text-center">
                    {item.month.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {tierEntries.length > 0 && (
          <div className="bg-background rounded-lg border border-border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Subscription Breakdown
            </h2>
            <div className="space-y-3">
              {tierEntries.map(([tier, count]) => (
                <div key={tier} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground font-medium">{tier}</span>
                    <span className="text-muted-foreground">
                      {count} (
                      {totalTierCount > 0
                        ? ((count / totalTierCount) * 100).toFixed(0)
                        : 0}
                      %)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${tierColors[tier] || "bg-primary"}`}
                      style={{
                        width: `${totalTierCount > 0 ? (count / totalTierCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data?.newPatients ? (
          <div className="bg-background rounded-lg border border-border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Patient Growth
            </h2>
            <div className="h-40 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-4xl font-bold text-foreground">
                  {data.newPatients}
                </p>
                <p className="text-sm mt-1">new patients this period</p>
                {data.patientsChange !== undefined && (
                  <p
                    className={`text-sm mt-1 font-medium ${data.patientsChange >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {data.patientsChange >= 0 ? "↑" : "↓"}{" "}
                    {Math.abs(data.patientsChange).toFixed(1)}% vs last period
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {data?.appointments ? (
          <div className="bg-background rounded-lg border border-border p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">
              Appointment Volume
            </h2>
            <div className="h-40 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <p className="text-4xl font-bold text-foreground">
                  {data.appointments}
                </p>
                <p className="text-sm mt-1">appointments this period</p>
                {data.appointmentsChange !== undefined && (
                  <p
                    className={`text-sm mt-1 font-medium ${data.appointmentsChange >= 0 ? "text-success" : "text-destructive"}`}
                  >
                    {data.appointmentsChange >= 0 ? "↑" : "↓"}{" "}
                    {Math.abs(data.appointmentsChange).toFixed(1)}% vs last
                    period
                  </p>
                )}
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
          <AnalyticsDetailedMetricsTable rows={data.detailedMetrics} />
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>No detailed metrics available for this period</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
