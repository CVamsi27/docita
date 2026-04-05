import { useMemo, useState } from "react";
import {
  useAnalyticsOverview,
  useComplianceMetrics,
  useDiseaseTrends,
  useRevenueByCPT,
} from "@/hooks/api/use-analytics";
import { useClinic } from "@/lib/clinic-context";
import type { ComplianceMetric } from "@workspace/types";

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

  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview();

  const { data: diseaseTrends = [], isLoading: trendsLoading } = useDiseaseTrends(
    defaultClinicId,
    startDate,
    endDate,
    {
      enabled: activeTab === "disease-trends",
    },
  );

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
    if (!complianceMetricsData) {
      return [];
    }

    return [
      {
        category: "Coding",
        metric: "Coding Completeness",
        score: complianceMetricsData.codingCompletenessRate,
        value: complianceMetricsData.codingCompletenessRate,
        issues: Math.max(
          complianceMetricsData.totalVisits - complianceMetricsData.codedVisits,
          0,
        ),
        status:
          complianceMetricsData.codingCompletenessRate >= 90
            ? "compliant"
            : "warning",
      },
      {
        category: "Billing",
        metric: "Billing Rate",
        score: complianceMetricsData.billingRate,
        value: complianceMetricsData.billingRate,
        issues: Math.max(
          complianceMetricsData.totalVisits - complianceMetricsData.billedVisits,
          0,
        ),
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
        status:
          complianceMetricsData.primaryDiagnosisRate >= 90
            ? "compliant"
            : "warning",
      },
      {
        category: "Procedure",
        metric: "Priced Procedures",
        score: 100 - complianceMetricsData.unbilledProceduresRate,
        value: 100 - complianceMetricsData.unbilledProceduresRate,
        issues: complianceMetricsData.proceduresWithoutPrice,
        status:
          complianceMetricsData.unbilledProceduresRate <= 10
            ? "compliant"
            : "warning",
      },
    ];
  }, [complianceMetricsData]);

  const isLoading = overviewLoading;

  return {
    state: {
      overview,
      diseaseTrends,
      revenueByCPT,
      complianceMetrics,
      activeTab,
      isLoading,
      trendsLoading,
      revenueLoading,
      complianceLoading,
    },
    handlers: {
      setActiveTab: (tab: AnalyticsTab) => setActiveTab(tab),
    },
  };
};
