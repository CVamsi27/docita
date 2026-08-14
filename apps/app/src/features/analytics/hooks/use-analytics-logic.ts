import { useMemo, useState } from "react";
import {
  useAnalyticsOverview,
  useComplianceMetrics,
  useDiseaseTrends,
  useRevenueByCPT,
} from "@workspace/data-access";
import { useClinic } from "@/lib/contexts/clinic-context";
import type { ComplianceMetric, DiseaseTrend } from "@workspace/types";

export type {
  AnalyticsOverview,
  ComplianceMetric,
  DiseaseTrend,
  RevenueByCPT,
} from "@workspace/types";

export type AnalyticsTab = "disease-trends" | "cpt-revenue" | "compliance";

export const useAnalyticsLogic = () => {
  const { clinicId } = useClinic();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("disease-trends");
  const defaultClinicId = clinicId || "default";
  const startDate = "";
  const endDate = "";

  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
    refetch: refetchOverview,
  } = useAnalyticsOverview();

  const { data: diseaseTrendsData = [], isLoading: trendsLoading } =
    useDiseaseTrends(defaultClinicId, startDate, endDate, {
      enabled: activeTab === "disease-trends",
    });

  // The API returns rows shaped as `{ icdCode, count }`, but the charts read
  // `disease`/`count`/`percentage`. Derive a human label and the share of
  // total so the bar labels and pie slice labels render real values instead
  // of "undefined".
  const diseaseTrends = useMemo<DiseaseTrend[]>(() => {
    const total = diseaseTrendsData.reduce(
      (sum, row) => sum + (row.count ?? 0),
      0,
    );
    return diseaseTrendsData.map((row) => {
      const count = row.count ?? 0;
      return {
        ...row,
        disease: row.icdCode?.code ?? row.disease ?? "Uncoded",
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    });
  }, [diseaseTrendsData]);

  const { data: revenueByCPTData = [], isLoading: revenueLoading } =
    useRevenueByCPT(defaultClinicId, startDate, endDate, {
      enabled: activeTab === "cpt-revenue",
    });

  const { data: complianceMetricsData, isLoading: complianceLoading } =
    useComplianceMetrics(defaultClinicId, startDate, endDate, {
      enabled: activeTab === "compliance",
    });

  const revenueByCPT = useMemo(
    () =>
      revenueByCPTData.map((item) => ({
        code: item.cptCode?.code || "UNKNOWN",
        description: item.cptCode?.description || "Unknown Procedure",
        revenue: item.totalRevenue,
        count: item.procedureCount,
        cptCode: item.cptCode?.code,
      })),
    [revenueByCPTData],
  );
  const complianceMetrics: ComplianceMetric[] = useMemo(() => {
    if (!complianceMetricsData) return [];
    return [
      {
        category: "Coding",
        metric: "Coding Completeness",
        score: complianceMetricsData.codingCompletenessRate,
        value: complianceMetricsData.codingCompletenessRate,
        issues: Math.max(complianceMetricsData.totalVisits - complianceMetricsData.codedVisits, 0),
        status: complianceMetricsData.codingCompletenessRate >= 90 ? "compliant" : "warning",
      },
      {
        category: "Billing",
        metric: "Billing Rate",
        score: complianceMetricsData.billingRate,
        value: complianceMetricsData.billingRate,
        issues: Math.max(complianceMetricsData.totalVisits - complianceMetricsData.billedVisits, 0),
        status:
          complianceMetricsData.billingRate >= 90 ? "compliant" : "warning",
      },
      {
        category: "Diagnosis",
        metric: "Primary Diagnosis Rate",
        score: complianceMetricsData.primaryDiagnosisRate,
        value: complianceMetricsData.primaryDiagnosisRate,
        issues: Math.max(
          complianceMetricsData.codedVisits -
            Math.round(
              (complianceMetricsData.primaryDiagnosisRate / 100) *
                complianceMetricsData.codedVisits,
            ),
          0,
        ),
        status: complianceMetricsData.primaryDiagnosisRate >= 90 ? "compliant" : "warning",
      },
      {
        category: "Procedure",
        metric: "Priced Procedures",
        score: 100 - complianceMetricsData.unbilledProceduresRate,
        value: 100 - complianceMetricsData.unbilledProceduresRate,
        issues: complianceMetricsData.proceduresWithoutPrice,
        status: complianceMetricsData.unbilledProceduresRate <= 10 ? "compliant" : "warning",
      },
    ];
  }, [complianceMetricsData]);
  const isLoading = overviewLoading;
  const isError = overviewError;

  return {
    state: {
      overview,
      diseaseTrends,
      revenueByCPT,
      complianceMetrics,
      activeTab,
      isLoading,
      isError,
      trendsLoading,
      revenueLoading,
      complianceLoading,
    },
    handlers: {
      setActiveTab: (tab: AnalyticsTab) => setActiveTab(tab),
      refetch: () => {
        void refetchOverview();
      },
    },
  };
};
