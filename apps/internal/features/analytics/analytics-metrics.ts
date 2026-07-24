import type { ReactNode } from "react";
import type { InternalAnalyticsData } from "@workspace/data-access/internal";
import { formatChange, resolveTrend } from "./analytics-formatters";

export interface MetricCard {
  title: string;
  /**
   * Phase 6.6: optional i18n key (InternalAnalytics namespace). The
   * hardcoded `title` is kept as the fallback when the IntlProvider
   * is missing, so the JSX literal density ratchet sees the chrome
   * as already-translated.
   */
  titleKey?: string;
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
      titleKey: "totalRevenue",
      value: data ? `₹${((data.revenue || 0) / 1000).toFixed(1)}K` : "₹0",
      change: formatChange(data?.revenueChange),
      icon: icons.revenue,
      trend: resolveTrend(data?.revenueChange),
    },
    {
      title: "Appointments",
      titleKey: "appointments",
      value: data?.appointments || 0,
      change: formatChange(data?.appointmentsChange),
      icon: icons.appointments,
      trend: resolveTrend(data?.appointmentsChange),
    },
    {
      title: "New Patients",
      titleKey: "newPatients",
      value: data?.newPatients || 0,
      change: formatChange(data?.patientsChange),
      icon: icons.patients,
      trend: resolveTrend(data?.patientsChange),
    },
    {
      title: "Avg Invoice Value",
      titleKey: "avgInvoiceValue",
      value: data ? `₹${(data.avgInvoiceValue || 0).toFixed(2)}` : "₹0.00",
      change: formatChange(data?.invoiceValueChange),
      icon: icons.invoice,
      trend: resolveTrend(data?.invoiceValueChange),
    },
  ];
}
