
import { useState, useMemo } from "react";
import { apiHooks } from "@/lib/api-hooks";
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

    const { data: overview, isLoading: overviewLoading } =
        apiHooks.useAnalyticsOverview();

    const { data: diseaseTrends = [], isLoading: trendsLoading } =
        apiHooks.useDiseaseTrends(
            clinicId || "default",
            dateRange.start,
            dateRange.end,
        );

    const { data: revenueByCPT = [], isLoading: revenueLoading } =
        apiHooks.useRevenueByCPT(
            clinicId || "default",
            dateRange.start,
            dateRange.end,
        );

    const { data: complianceMetrics = [], isLoading: complianceLoading } =
        apiHooks.useComplianceMetrics(
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
        }
    };
};
