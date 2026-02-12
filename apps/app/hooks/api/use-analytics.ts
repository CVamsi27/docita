import { UseQueryOptions } from "@tanstack/react-query";
import {
  AnalyticsOverview,
  ComplianceMetric,
  DiseaseTrend,
  RevenueByCPT,
} from "@workspace/types";
import { useAPIQuery } from "../../lib/api-core";
import { ApiError } from "@/lib/errors";

export const useAnalyticsOverview = () =>
  useAPIQuery<AnalyticsOverview>(
    ["analytics", "overview"],
    "/analytics/overview",
  );

export const useDiseaseTrends = (
  clinicId: string,
  startDate?: string,
  endDate?: string,
) => {
  const params = new URLSearchParams({ clinicId });
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  return useAPIQuery<DiseaseTrend[]>(
    ["analytics", "disease-trends", clinicId, startDate || "", endDate || ""],
    `/analytics/disease-trends?${params}`,
  );
};

export const useRevenueByCPT = (
  clinicId: string,
  startDate?: string,
  endDate?: string,
) => {
  const params = new URLSearchParams({ clinicId });
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  return useAPIQuery<RevenueByCPT[]>(
    ["analytics", "revenue-cpt", clinicId, startDate || "", endDate || ""],
    `/analytics/revenue/by-cpt?${params}`,
  );
};

export const useComplianceMetrics = (
  clinicId: string,
  startDate?: string,
  endDate?: string,
) => {
  const params = new URLSearchParams({ clinicId });
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  return useAPIQuery<ComplianceMetric[]>(
    ["analytics", "compliance", clinicId, startDate || "", endDate || ""],
    `/analytics/compliance/metrics?${params}`,
  );
};

export const useRevenueMetrics = (
  clinicId: string,
  period: "daily" | "weekly" | "monthly" = "monthly",
  startDate?: Date,
  endDate?: Date,
) =>
  useAPIQuery<
    Array<{
      date: string;
      totalRevenue: number;
      invoiceCount: number;
      avgInvoiceAmount: number;
    }>
  >(
    [
      "revenue-metrics",
      clinicId,
      period,
      startDate?.toISOString() || "",
      endDate?.toISOString() || "",
    ],
    `/analytics/revenue-metrics?clinicId=${clinicId}&period=${period}${startDate ? `&startDate=${startDate.toISOString()}` : ""}${endDate ? `&endDate=${endDate.toISOString()}` : ""}`,
    { staleTime: 1000 * 60 * 5 },
  );

export const useAppointmentMetrics = (
  clinicId: string,
  period: "daily" | "weekly" | "monthly" = "monthly",
  startDate?: Date,
  endDate?: Date,
) =>
  useAPIQuery<{
    total: number;
    booked: number;
    completed: number;
    cancelled: number;
    noShow: number;
    fillRate: number;
    completionRate: number;
  }>(
    [
      "appointment-metrics",
      clinicId,
      period,
      startDate?.toISOString() || "",
      endDate?.toISOString() || "",
    ],
    `/analytics/appointment-metrics?clinicId=${clinicId}&period=${period}${startDate ? `&startDate=${startDate.toISOString()}` : ""}${endDate ? `&endDate=${endDate.toISOString()}` : ""}`,
    { staleTime: 1000 * 60 * 5 },
  );

export const usePatientDemographics = (
  clinicId: string,
  startDate?: Date,
  endDate?: Date,
) =>
  useAPIQuery<{
    totalPatients: number;
    newPatients: number;
    ageDistribution: Record<string, number>;
    genderDistribution: Record<string, number>;
  }>(
    [
      "patient-demographics",
      clinicId,
      startDate?.toISOString() || "",
      endDate?.toISOString() || "",
    ],
    `/analytics/patient-demographics?clinicId=${clinicId}${startDate ? `&startDate=${startDate.toISOString()}` : ""}${endDate ? `&endDate=${endDate.toISOString()}` : ""}`,
    { staleTime: 1000 * 60 * 5 },
  );

export const useTopConditions = (clinicId: string, limit: number = 10) =>
  useAPIQuery<
    Array<{
      condition: string;
      count: number;
      percentage: number;
    }>
  >(
    ["top-conditions", clinicId, limit.toString()],
    `/analytics/top-conditions?clinicId=${clinicId}&limit=${limit}`,
    { staleTime: 1000 * 60 * 5 },
  );

export const useAuditLogs = (
  clinicId?: string,
  actionType?: string,
  startDate?: Date,
  endDate?: Date,
  options?: UseQueryOptions<
    Array<{
      id: string;
      clinicId: string;
      userId: string;
      action: string;
      entityType: string;
      createdAt: Date;
    }>,
    ApiError
  >,
) =>
  useAPIQuery<
    Array<{
      id: string;
      clinicId: string;
      userId: string;
      action: string;
      entityType: string;
      createdAt: Date;
    }>
  >(
    [
      "audit-logs",
      clinicId || "",
      actionType || "",
      startDate?.toISOString() || "",
      endDate?.toISOString() || "",
    ],
    `/audit-logs?${clinicId ? `clinicId=${clinicId}&` : ""}${actionType ? `actionType=${actionType}&` : ""}${startDate ? `startDate=${startDate.toISOString()}&` : ""}${endDate ? `endDate=${endDate.toISOString()}` : ""}`,
    { staleTime: 1000 * 60, ...options },
  );
