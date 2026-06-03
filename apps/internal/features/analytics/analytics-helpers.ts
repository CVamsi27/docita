import type { ReactNode } from "react";
import type { InternalAnalyticsData } from "@workspace/data-access/internal";

export interface MetricCard {
  title: string;
  value: string | number;
  change?: string;
  icon: ReactNode;
  trend?: "up" | "down" | "neutral";
}

export interface MetricCardIcons {
  revenue: ReactNode;
  appointments: ReactNode;
  patients: ReactNode;
  invoice: ReactNode;
}

export function buildAnalyticsParams(
  period: string,
  startDate: string,
  endDate: string,
): string {
  const params = new URLSearchParams({ period });
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  return params.toString();
}

export function formatCurrency(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
}

function formatChange(value: number | undefined | null): string | undefined {
  if (!value) return undefined;
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function resolveTrend(
  value: number | undefined | null,
): "up" | "down" | "neutral" {
  if (!value) return "neutral";
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "neutral";
}

export function buildMetricCards(
  data: InternalAnalyticsData | null,
  icons: MetricCardIcons,
): MetricCard[] {
  return [
    {
      title: "Total Revenue",
      value: data ? `₹${((data.revenue || 0) / 1000).toFixed(1)}K` : "₹0",
      change: formatChange(data?.revenueChange),
      icon: icons.revenue,
      trend: resolveTrend(data?.revenueChange),
    },
    {
      title: "Appointments",
      value: data?.appointments || 0,
      change: formatChange(data?.appointmentsChange),
      icon: icons.appointments,
      trend: resolveTrend(data?.appointmentsChange),
    },
    {
      title: "New Patients",
      value: data?.newPatients || 0,
      change: formatChange(data?.patientsChange),
      icon: icons.patients,
      trend: resolveTrend(data?.patientsChange),
    },
    {
      title: "Avg Invoice Value",
      value: data ? `₹${(data.avgInvoiceValue || 0).toFixed(2)}` : "₹0.00",
      change: formatChange(data?.invoiceValueChange),
      icon: icons.invoice,
      trend: resolveTrend(data?.invoiceValueChange),
    },
  ];
}

export function computeTierEntries(
  subscriptionsByTier: Record<string, number> | undefined,
): [string, number][] {
  return subscriptionsByTier
    ? Object.entries(subscriptionsByTier).sort((a, b) => b[1] - a[1])
    : [];
}

export function computeTotalTierCount(
  tierEntries: [string, number][],
): number {
  return tierEntries.reduce((sum, [, value]) => sum + value, 0);
}

export function computeRevenueByMonth(
  revenueByMonth: Array<{ month: string; revenue: number }> | undefined,
): Array<{ month: string; revenue: number }> {
  return revenueByMonth || [];
}

export function computeMaxRevenue(
  revenueByMonth: Array<{ month: string; revenue: number }>,
): number {
  return Math.max(...revenueByMonth.map((row) => row.revenue), 1);
}

export function computePageStatus(
  token: string | null,
  loading: boolean,
  hasData: boolean,
  error: unknown,
): "loading" | "error" | "success" {
  if (!token || (loading && !hasData)) return "loading";
  if (error) return "error";
  return "success";
}

export const ANALYTICS_LOAD_ERROR_FALLBACK = "We could not load this analytics view. Please try again.";
export const ANALYTICS_EXPORT_ERROR = "We could not export the report. Please try again.";
