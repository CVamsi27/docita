import { Activity, DollarSign, TrendingUp, Users } from "lucide-react";
import type { InternalAnalyticsData } from "@workspace/data-access/internal";
import {
  formatCompactCurrency,
  formatCurrency,
  WHOLE_AMOUNT_CURRENCY_OPTIONS,
} from "@workspace/utils";

export function formatChange(
  value: number | undefined | null,
): string | undefined {
  if (!value) return undefined;
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function resolveTrend(
  value: number | undefined | null,
): "up" | "down" | "neutral" {
  if (!value) return "neutral";
  return value > 0 ? "up" : "down";
}

export function buildMetrics(data: InternalAnalyticsData | null) {
  const icons = {
    revenue: <DollarSign className="h-6 w-6" />,
    appointments: <Activity className="h-6 w-6" />,
    patients: <Users className="h-6 w-6" />,
    invoice: <TrendingUp className="h-6 w-6" />,
  };
  return [
    {
      title: "Total Revenue",
      value: data
        ? formatCompactCurrency(data.revenue || 0, WHOLE_AMOUNT_CURRENCY_OPTIONS)
        : formatCompactCurrency(0, WHOLE_AMOUNT_CURRENCY_OPTIONS),
      change: formatChange(data?.revenueChange),
      trend: resolveTrend(data?.revenueChange),
      icon: icons.revenue,
    },
    {
      title: "Appointments",
      value: String(data?.appointments || 0),
      change: formatChange(data?.appointmentsChange),
      trend: resolveTrend(data?.appointmentsChange),
      icon: icons.appointments,
    },
    {
      title: "New Patients",
      value: String(data?.newPatients || 0),
      change: formatChange(data?.patientsChange),
      trend: resolveTrend(data?.patientsChange),
      icon: icons.patients,
    },
    {
      title: "Avg Invoice Value",
      value: data
        ? formatCurrency(data.avgInvoiceValue || 0, WHOLE_AMOUNT_CURRENCY_OPTIONS)
        : formatCurrency(0, WHOLE_AMOUNT_CURRENCY_OPTIONS),
      change: formatChange(data?.invoiceValueChange),
      trend: resolveTrend(data?.invoiceValueChange),
      icon: icons.invoice,
    },
  ];
}
