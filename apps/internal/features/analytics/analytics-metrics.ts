import type { ReactNode } from "react";
import type { InternalAnalyticsData } from "@workspace/data-access/internal";
import { formatChange, resolveTrend } from "./analytics-formatters";

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
