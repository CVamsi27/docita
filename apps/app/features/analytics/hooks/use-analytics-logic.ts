import { useState, useMemo } from "react";
import {
  useAnalyticsOverview,
  useDiseaseTrends,
  useRevenueByCPT,
  useComplianceMetrics,
} from "@/hooks/api/use-analytics";
import { useClinic } from "@/lib/clinic-context";

export interface AnalyticsOverview {
  totalPatients: number;
  patientGrowth: number;
  newPatientsThisMonth: number;
  appointmentsThisMonth: number;
  revenueThisMonth: number;
  revenueGrowth: number;
  [key: string]: any;
}

export interface DiseaseTrend {
  disease: string;
  count: number;
  percentage: number;
  [key: string]: any;
}

export interface RevenueCPT {
  cptCode: string;
  revenue: number;
  count: number;
  [key: string]: any;
}

export interface ComplianceMetric {
  metric: string;
  value: number;
  status: "good" | "warning";
  [key: string]: any;
}

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
      overview: overview as AnalyticsOverview | undefined,
      diseaseTrends: diseaseTrends as DiseaseTrend[],
      revenueByCPT: revenueByCPT as RevenueCPT[],
      complianceMetrics: complianceMetrics as ComplianceMetric[],
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
