"use client";

import { useCallback, useMemo, useState } from "react";
import { Activity, DollarSign, TrendingUp, Users } from "lucide-react";
import { API_URL } from "@/lib/api/api-config";
import { useAuth } from "@/lib/auth/auth";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { toast } from "sonner";
import { downloadInternalAnalyticsExport, type InternalAnalyticsData, type InternalBillingMetrics, useInternalAnalytics, useInternalBillingMetrics } from "@workspace/data-access/internal";
import { getUserFacingErrorMessage } from "@workspace/utils";
import { ANALYTICS_EXPORT_ERROR, ANALYTICS_LOAD_ERROR_FALLBACK, buildAnalyticsParams, buildMetricCards, computeMaxRevenue, computePageStatus, computeRevenueByMonth, computeTierEntries, computeTotalTierCount, formatCurrency, type MetricCard, type MetricCardIcons } from "./analytics-helpers";

export interface UseAnalyticsDashboardReturn {
  period: "daily" | "weekly" | "monthly";
  setPeriod: (p: "daily" | "weekly" | "monthly") => void;
  startDate: string;
  setStartDate: (d: string) => void;
  endDate: string;
  setEndDate: (d: string) => void;
  data: InternalAnalyticsData | null;
  billing: InternalBillingMetrics | null;
  pageStatus: "loading" | "error" | "success";
  errorMessage: string | undefined;
  handleExport: () => Promise<void>;
  formatCurrency: (amount: number) => string;
  metrics: MetricCard[];
  tierEntries: [string, number][];
  totalTierCount: number;
  revenueByMonth: { month: string; revenue: number }[];
  maxRevenue: number;
  refetch: () => void;
}

const ICONS: MetricCardIcons = {
  revenue: <DollarSign className="h-6 w-6" />,
  appointments: <Activity className="h-6 w-6" />,
  patients: <Users className="h-6 w-6" />,
  invoice: <TrendingUp className="h-6 w-6" />,
};

export function useAnalyticsDashboard(): UseAnalyticsDashboardReturn {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { token } = useAuth();

  const analyticsParams = useMemo(
    () => buildAnalyticsParams(period, startDate, endDate),
    [period, startDate, endDate],
  );
  const analyticsQuery = useInternalAnalytics(token, analyticsParams);
  const billingQuery = useInternalBillingMetrics(token);

  const data = analyticsQuery.data ?? null;
  const billing = billingQuery.data ?? null;
  const loading = analyticsQuery.isLoading || billingQuery.isLoading;
  const queryError = analyticsQuery.error ?? billingQuery.error;
  const errorMessage = queryError
    ? getUserFacingErrorMessage(queryError, {
        context: "load",
        fallback: ANALYTICS_LOAD_ERROR_FALLBACK,
      })
    : undefined;
  const pageStatus = computePageStatus(token, loading, !!data, queryError);

  const refetch = useCallback(() => {
    void analyticsQuery.refetch();
    void billingQuery.refetch();
  }, [analyticsQuery, billingQuery]);

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
      showUserFacingErrorToast(ANALYTICS_EXPORT_ERROR);
    }
  }, [endDate, period, startDate, token]);

  const metrics = useMemo(() => buildMetricCards(data, ICONS), [data]);
  const tierEntries = useMemo(
    () => computeTierEntries(billing?.subscriptionsByTier),
    [billing?.subscriptionsByTier],
  );
  const totalTierCount = useMemo(() => computeTotalTierCount(tierEntries), [tierEntries]);
  const revenueByMonth = useMemo(
    () => computeRevenueByMonth(billing?.revenueByMonth),
    [billing?.revenueByMonth],
  );
  const maxRevenue = useMemo(() => computeMaxRevenue(revenueByMonth), [revenueByMonth]);

  return {
    period, setPeriod, startDate, setStartDate, endDate, setEndDate,
    data, billing, pageStatus, errorMessage, handleExport, formatCurrency,
    metrics, tierEntries, totalTierCount, revenueByMonth, maxRevenue, refetch,
  };
}
