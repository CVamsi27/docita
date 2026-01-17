import { useState } from "react";
import {
  useAnalyticsOverview,
  useComplianceMetrics,
  useDiseaseTrends,
  useRevenueByCPT,
} from "@/hooks/api/use-analytics";
import { useClinic } from "@/lib/clinic-context";

export type {
  AnalyticsOverview,
  ComplianceMetric,
  DiseaseTrend,
  RevenueByCPT,
} from "@workspace/types";

export const useAnalyticsLogic = () => {
  const { clinicId } = useClinic();
  const [dateRange] = useState({ start: "", end: "" });

  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview();

  const { data: diseaseTrends = [], isLoading: trendsLoading } =
    useDiseaseTrends(
      clinicId || "default",
      dateRange.start,
      dateRange.end,
    );

  const { data: revenueByCPT = [], isLoading: revenueLoading } =
    useRevenueByCPT(
      clinicId || "default",
      dateRange.start,
      dateRange.end,
    );

  const { data: complianceMetrics = [], isLoading: complianceLoading } =
    useComplianceMetrics(
      clinicId || "default",
      dateRange.start,
      dateRange.end,
    );

  const isLoading = overviewLoading; // Primary loading state

  return {
    state: {
      overview: overview,
      diseaseTrends: diseaseTrends,
      revenueByCPT: revenueByCPT,
      complianceMetrics: complianceMetrics,
      isLoading,
      trendsLoading,
      revenueLoading,
      complianceLoading,
    },
    handlers: {
      // Future: setDateRange, refetch, etc.
    },
  };
};
