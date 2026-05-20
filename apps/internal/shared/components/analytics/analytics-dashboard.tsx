"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import dynamic from "next/dynamic";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Calendar, DollarSign, Download, TrendingUp, Users } from "lucide-react";
import { API_URL } from "@/lib/api/api-config";
import { useAuth } from "@/lib/auth/auth";
import { toast } from "sonner";
import {
  downloadInternalAnalyticsExport,
  useInternalAnalytics,
  useInternalBillingMetrics,
  type InternalAnalyticsData as AnalyticsData,
  type InternalBillingMetrics as BillingMetrics,
} from "@workspace/data-access/internal";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { Button } from "@workspace/ui/components/form/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { DatePicker } from "@workspace/ui/components/form/date-picker";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { Section } from "@workspace/ui/components/layout/section";
import { cn } from "@workspace/ui/lib/utils";
import { formatAmountLocale } from "@workspace/utils";
import type { DetailedMetricsRow } from "@/components/analytics/analytics-detailed-metrics-table";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

const AnalyticsDetailedMetricsTable = dynamic(
  () =>
    import("@/components/analytics/analytics-detailed-metrics-table").then(
      (module) => module.AnalyticsDetailedMetricsTable,
    ),
  {
    loading: () => (
      <div
        className="ui-section-stack flex flex-col items-center gap-3 py-8 text-center text-muted-foreground"
        role="status"
        aria-live="polite"
        aria-label="Loading detailed metrics"
      >
        <DocitaLoadingIndicator
          variant="section"
          withStatusRole={false}
          iconClassName="h-8 w-8"
        />
        <p className="text-sm">Loading detailed metrics…</p>
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

const tierColors: Record<string, string> = {
  CAPTURE: "bg-muted",
  CORE: "bg-info",
  PLUS: "bg-success",
  PRO: "bg-primary",
  CLINIC: "bg-processing",
  ENTERPRISE: "bg-warning",
};

const trendToneClassNames: Record<NonNullable<MetricCard["trend"]>, string> = {
  up: "text-success",
  down: "text-destructive",
  neutral: "text-muted-foreground",
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

  const analyticsQuery = useInternalAnalytics(token, analyticsParams);
  const billingQuery = useInternalBillingMetrics(token);

  const data = analyticsQuery.data ?? null;
  const billing = billingQuery.data ?? null;
  const loading = analyticsQuery.isLoading || billingQuery.isLoading;

  useEffect(() => {
    if (analyticsQuery.isError || billingQuery.isError) {
      showUserFacingErrorToast(
        "We could not load this analytics view. Please try again.",
      );
    }
  }, [analyticsQuery.isError, billingQuery.isError]);

  const handleExport = useCallback(async () => {
    if (!token) return;

    try {
      const blob = await downloadInternalAnalyticsExport(
        API_URL,
        { Authorization: `Bearer ${token}` },
        { period, startDate, endDate },
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-report-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Report exported successfully");
    } catch {
      showUserFacingErrorToast(
        "We could not export the report. Please try again.",
      );
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
      <div
        className="flex items-center justify-center py-12"
        role="status"
        aria-live="polite"
        aria-label="Loading analytics"
      >
        <DocitaLoadingIndicator
          variant="section"
          withStatusRole={false}
          iconClassName="h-8 w-8 text-muted-foreground"
        />
      </div>
    );
  }

  return (
    <AppPageScaffold
      className="px-4 py-6 md:px-6"
      header={
        <PageHeader
          title="Analytics Dashboard"
          description="Real-time facility performance metrics with consistent reporting and subscription insights."
          actions={
            <Button onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          }
        />
      }
    >
      {billing && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card density="compact">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-3">
                <div className="ui-copy-stack">
                  <CardTitle>MRR</CardTitle>
                  <CardDescription>
                    Recurring monthly revenue snapshot
                  </CardDescription>
                </div>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="ui-copy-stack">
              <p className="ui-page-title">{formatCurrency(billing.mrr)}</p>
              <p className="ui-helper-text">
                ARR: {formatCurrency(billing.arr)}
              </p>
            </CardContent>
          </Card>

          <Card density="compact">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-3">
                <div className="ui-copy-stack">
                  <CardTitle>Active Subscriptions</CardTitle>
                  <CardDescription>
                    Paid customers across all tiers
                  </CardDescription>
                </div>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="ui-copy-stack">
              <p className="ui-page-title">{billing.activeSubscriptions}</p>
              <p className="ui-helper-text">
                Churn rate: {(billing.churnRate * 100).toFixed(1)}% (30d)
              </p>
            </CardContent>
          </Card>

          <Card density="compact">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-3">
                <div className="ui-copy-stack">
                  <CardTitle>Tier Distribution</CardTitle>
                  <CardDescription>
                    Subscription share by plan tier
                  </CardDescription>
                </div>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {tierEntries.map(([tier, count]) => (
                <div key={tier} className="flex items-center gap-2">
                  <span className="w-16 truncate ui-helper-text">{tier}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${tierColors[tier] || "bg-primary"}`}
                      style={{
                        width: `${totalTierCount > 0 ? (count / totalTierCount) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <span className="w-6 text-right text-sm font-medium text-foreground">
                    {count}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <Section
        title="Reporting Window"
        description="Filter the dashboard by time range without breaking the shared page rhythm."
        contentClassName="space-y-4"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["daily", "weekly", "monthly"] as const).map((p) => (
              <Button
                key={p}
                onClick={() => setPeriod(p)}
                size="sm"
                variant={period === p ? "default" : "outline"}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <DatePicker
                value={startDate || undefined}
                onChange={(date) =>
                  setStartDate(date?.toISOString().slice(0, 10) ?? "")
                }
                placeholder="Start date"
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="ui-helper-text">to</span>
              <DatePicker
                value={endDate || undefined}
                onChange={(date) =>
                  setEndDate(date?.toISOString().slice(0, 10) ?? "")
                }
                placeholder="End date"
                className="w-40"
              />
            </div>
          </div>
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, idx) => (
          <Card key={idx} density="compact">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between gap-3">
                <CardDescription className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardDescription>
                <div className="text-muted-foreground">{metric.icon}</div>
              </div>
            </CardHeader>
            <CardContent className="ui-copy-stack">
              <p className="ui-page-title">{metric.value}</p>
              {metric.change && (
                <p
                  className={cn(
                    "text-sm font-medium",
                    trendToneClassNames[metric.trend ?? "neutral"],
                  )}
                >
                  {metric.trend === "up"
                    ? "↑"
                    : metric.trend === "down"
                      ? "↓"
                      : "→"}{" "}
                  {metric.change} from last period
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {revenueByMonth.length > 0 && (
          <Section
            title="MRR Trend (6 months)"
            description="Recent recurring revenue performance"
            contentClassName="space-y-4"
          >
            <div className="flex items-end gap-2 h-40">
              {revenueByMonth.map((item) => (
                <div
                  key={item.month}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <div
                    className="w-full bg-primary rounded-t-sm min-h-[4px]"
                    style={{
                      height: `${Math.round((item.revenue / maxRevenue) * 100)}%`,
                    }}
                    title={`${item.month}: ₹${formatAmountLocale(item.revenue, "en-IN", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}`}
                  />
                  <span className="text-xs text-muted-foreground truncate w-full text-center">
                    {item.month.split(" ")[0]}
                  </span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {tierEntries.length > 0 && (
          <Section
            title="Subscription Breakdown"
            description="Customer mix across Docita plans"
            contentClassName="space-y-3"
          >
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
          </Section>
        )}

        {data?.newPatients ? (
          <Section
            title="Patient Growth"
            description="New-patient momentum in the current period"
            contentClassName="flex h-40 items-center justify-center"
          >
            <div className="text-center">
              <p className="text-[var(--fs-4xl)] font-bold text-foreground">
                {data.newPatients}
              </p>
              <p className="ui-section-subtitle mt-1">
                new patients this period
              </p>
              {data.patientsChange !== undefined && (
                <p
                  className={cn(
                    "mt-1 text-sm font-medium",
                    data.patientsChange >= 0
                      ? "text-success"
                      : "text-destructive",
                  )}
                >
                  {data.patientsChange >= 0 ? "↑" : "↓"}{" "}
                  {Math.abs(data.patientsChange).toFixed(1)}% vs last period
                </p>
              )}
            </div>
          </Section>
        ) : null}

        {data?.appointments ? (
          <Section
            title="Appointment Volume"
            description="Booked appointment activity in the selected range"
            contentClassName="flex h-40 items-center justify-center"
          >
            <div className="text-center">
              <p className="text-[var(--fs-4xl)] font-bold text-foreground">
                {data.appointments}
              </p>
              <p className="ui-section-subtitle mt-1">
                appointments this period
              </p>
              {data.appointmentsChange !== undefined && (
                <p
                  className={cn(
                    "mt-1 text-sm font-medium",
                    data.appointmentsChange >= 0
                      ? "text-success"
                      : "text-destructive",
                  )}
                >
                  {data.appointmentsChange >= 0 ? "↑" : "↓"}{" "}
                  {Math.abs(data.appointmentsChange).toFixed(1)}% vs last period
                </p>
              )}
            </div>
          </Section>
        ) : null}
      </div>

      <Section
        title="Detailed Metrics"
        description="Expanded operational metrics for the selected time range."
        contentClassName="space-y-4"
      >
        {data?.detailedMetrics && data.detailedMetrics.length > 0 ? (
          <AnalyticsDetailedMetricsTable
            rows={data.detailedMetrics as unknown as DetailedMetricsRow[]}
          />
        ) : (
          <div className="ui-section-stack py-8 text-center text-muted-foreground">
            <p>No detailed metrics available for this period</p>
          </div>
        )}
      </Section>
    </AppPageScaffold>
  );
}

