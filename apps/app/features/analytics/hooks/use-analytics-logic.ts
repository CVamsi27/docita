import { useState } from "react";
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

export const useAnalyticsLogic = () => {
  const { clinicId } = useClinic();
  const [dateRange] = useState({ start: "", end: "" });

  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview();

  const { data: diseaseTrends = [], isLoading: trendsLoading } =
    useDiseaseTrends(clinicId || "default", dateRange.start, dateRange.end);

  const { data: revenueByCPTData = [], isLoading: revenueLoading } =
    useRevenueByCPT(clinicId || "default", dateRange.start, dateRange.end);

  const { data: complianceMetricsData, isLoading: complianceLoading } =
    useComplianceMetrics(clinicId || "default", dateRange.start, dateRange.end);

  const revenueByCPT = revenueByCPTData.map((item) => ({
    code: item.cptCode?.code || "UNKNOWN",
    description: item.cptCode?.description || "Unknown Procedure",
    revenue: item.totalRevenue,
    count: item.procedureCount,
    cptCode: item.cptCode?.code,
  }));

  const complianceMetrics: ComplianceMetric[] = complianceMetricsData
    ? [
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
      ]
    : [];

  const isLoading = overviewLoading; 

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

    },
  };
};
