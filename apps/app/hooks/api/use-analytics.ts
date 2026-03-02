import { UseQueryOptions } from "@tanstack/react-query";
import {
  AnalyticsAppointmentMetricsResponse,
  AnalyticsCodingComplianceMetricsResponse,
  AnalyticsDateRangeQuery,
  AnalyticsLimitQuery,
  AnalyticsOverview,
  AnalyticsPatientDemographicsResponse,
  AnalyticsPeriodDateRangeQuery,
  AnalyticsRevenueByCptListResponse,
  AnalyticsRevenueMetricsResponse,
  AnalyticsTopConditionListResponse,
  DiseaseTrend,
} from "@workspace/types";
import { useAPIQuery } from "@/lib/api-core";
import { ApiError } from "@/lib/errors";

const buildQueryString = (
  query: Record<string, string | number | undefined>,
) => {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
};

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
  const query: AnalyticsDateRangeQuery = { clinicId, startDate, endDate };

  return useAPIQuery<DiseaseTrend[]>(
    ["analytics", "disease-trends", clinicId, startDate || "", endDate || ""],
    `/analytics/disease-trends${buildQueryString(query)}`,
  );
};

export const useRevenueByCPT = (
  clinicId: string,
  startDate?: string,
  endDate?: string,
) => {
  const query: AnalyticsDateRangeQuery = { clinicId, startDate, endDate };

  return useAPIQuery<AnalyticsRevenueByCptListResponse>(
    ["analytics", "revenue-cpt", clinicId, startDate || "", endDate || ""],
    `/analytics/revenue/by-cpt${buildQueryString(query)}`,
  );
};

export const useComplianceMetrics = (
  clinicId: string,
  startDate?: string,
  endDate?: string,
) => {
  const query: AnalyticsDateRangeQuery = { clinicId, startDate, endDate };

  return useAPIQuery<AnalyticsCodingComplianceMetricsResponse>(
    ["analytics", "compliance", clinicId, startDate || "", endDate || ""],
    `/analytics/compliance/metrics${buildQueryString(query)}`,
  );
};

export const useRevenueMetrics = (
  clinicId: string,
  period: "daily" | "weekly" | "monthly" = "monthly",
  startDate?: Date,
  endDate?: Date,
) =>
  useAPIQuery<AnalyticsRevenueMetricsResponse>(
    [
      "revenue-metrics",
      clinicId,
      period,
      startDate?.toISOString() || "",
      endDate?.toISOString() || "",
    ],
    `/analytics/revenue-metrics${buildQueryString({
      ...( { clinicId, period } as AnalyticsPeriodDateRangeQuery),
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    })}`,
    { staleTime: 1000 * 60 * 5 },
  );

export const useAppointmentMetrics = (
  clinicId: string,
  period: "daily" | "weekly" | "monthly" = "monthly",
  startDate?: Date,
  endDate?: Date,
) =>
  useAPIQuery<AnalyticsAppointmentMetricsResponse>(
    [
      "appointment-metrics",
      clinicId,
      period,
      startDate?.toISOString() || "",
      endDate?.toISOString() || "",
    ],
    `/analytics/appointment-metrics${buildQueryString({
      ...( { clinicId, period } as AnalyticsPeriodDateRangeQuery),
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    })}`,
    { staleTime: 1000 * 60 * 5 },
  );

export const usePatientDemographics = (
  clinicId: string,
  startDate?: Date,
  endDate?: Date,
) =>
  useAPIQuery<AnalyticsPatientDemographicsResponse>(
    [
      "patient-demographics",
      clinicId,
      startDate?.toISOString() || "",
      endDate?.toISOString() || "",
    ],
    `/analytics/patient-demographics${buildQueryString({
      ...( { clinicId } as AnalyticsDateRangeQuery),
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    })}`,
    { staleTime: 1000 * 60 * 5 },
  );

export const useTopConditions = (clinicId: string, limit: number = 10) =>
  useAPIQuery<AnalyticsTopConditionListResponse>(
    ["top-conditions", clinicId, limit.toString()],
    `/analytics/top-conditions${buildQueryString({
      ...( { clinicId, limit } as AnalyticsLimitQuery),
    })}`,
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
