import { UseQueryOptions } from "@tanstack/react-query";
import { queryKeys } from "@workspace/data-access";
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
  Feature,
} from "@workspace/types";
import { useAPIQuery } from "../core/use-api-query";
import { useDataAccessContext } from "../provider/hooks";
type APIQueryOptions<T> = Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">;

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

export const useAnalyticsOverview = (
  options?: APIQueryOptions<AnalyticsOverview>,
) => {
  const basicOk = useDataAccessContext().isTierFeatureEnabled(Feature.BASIC_ANALYTICS);
  return useAPIQuery<AnalyticsOverview>(
    queryKeys.analytics.overview(),
    "/analytics/overview",
    {
      ...options,
      enabled: basicOk && (options?.enabled ?? true),
    },
  );
};

export const useDiseaseTrends = (
  clinicId: string,
  startDate?: string,
  endDate?: string,
  options?: APIQueryOptions<DiseaseTrend[]>,
) => {
  const basicOk = useDataAccessContext().isTierFeatureEnabled(Feature.BASIC_ANALYTICS);
  const advancedOk = useDataAccessContext().isTierFeatureEnabled(Feature.ADVANCED_ANALYTICS);
  const tierOk = basicOk && advancedOk;
  const query: AnalyticsDateRangeQuery = { clinicId, startDate, endDate };

  return useAPIQuery<DiseaseTrend[]>(
    queryKeys.analytics.diseaseTrends(clinicId, startDate || "", endDate || ""),
    `/analytics/disease-trends${buildQueryString(query)}`,
    {
      ...options,
      enabled: tierOk && (options?.enabled ?? true),
    },
  );
};

export const useRevenueByCPT = (
  clinicId: string,
  startDate?: string,
  endDate?: string,
  options?: APIQueryOptions<AnalyticsRevenueByCptListResponse>,
) => {
  const basicOk = useDataAccessContext().isTierFeatureEnabled(Feature.BASIC_ANALYTICS);
  const advancedOk = useDataAccessContext().isTierFeatureEnabled(Feature.ADVANCED_ANALYTICS);
  const tierOk = basicOk && advancedOk;
  const query: AnalyticsDateRangeQuery = { clinicId, startDate, endDate };

  return useAPIQuery<AnalyticsRevenueByCptListResponse>(
    queryKeys.analytics.revenueByCpt(clinicId, startDate || "", endDate || ""),
    `/analytics/revenue/by-cpt${buildQueryString(query)}`,
    {
      ...options,
      enabled: tierOk && (options?.enabled ?? true),
    },
  );
};

export const useComplianceMetrics = (
  clinicId: string,
  startDate?: string,
  endDate?: string,
  options?: APIQueryOptions<AnalyticsCodingComplianceMetricsResponse>,
) => {
  const basicOk = useDataAccessContext().isTierFeatureEnabled(Feature.BASIC_ANALYTICS);
  const advancedOk = useDataAccessContext().isTierFeatureEnabled(Feature.ADVANCED_ANALYTICS);
  const tierOk = basicOk && advancedOk;
  const query: AnalyticsDateRangeQuery = { clinicId, startDate, endDate };

  return useAPIQuery<AnalyticsCodingComplianceMetricsResponse>(
    queryKeys.analytics.complianceMetrics(clinicId, startDate || "", endDate || ""),
    `/analytics/compliance/metrics${buildQueryString(query)}`,
    {
      ...options,
      enabled: tierOk && (options?.enabled ?? true),
    },
  );
};

export const useRevenueMetrics = (
  clinicId: string,
  period: "daily" | "weekly" | "monthly" = "monthly",
  startDate?: Date,
  endDate?: Date,
) => {
  const basicOk = useDataAccessContext().isTierFeatureEnabled(Feature.BASIC_ANALYTICS);
  const advancedOk = useDataAccessContext().isTierFeatureEnabled(Feature.ADVANCED_ANALYTICS);
  const tierOk = basicOk && advancedOk;
  return useAPIQuery<AnalyticsRevenueMetricsResponse>(
    queryKeys.analytics.revenueMetrics(
      clinicId,
      period,
      startDate?.toISOString() || "",
      endDate?.toISOString() || "",
    ),
    `/analytics/revenue-metrics${buildQueryString({
      ...( { clinicId, period } as AnalyticsPeriodDateRangeQuery),
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    })}`,
    { staleTime: 1000 * 60 * 5, enabled: tierOk },
  );
};

export const useAppointmentMetrics = (
  clinicId: string,
  period: "daily" | "weekly" | "monthly" = "monthly",
  startDate?: Date,
  endDate?: Date,
) => {
  const basicOk = useDataAccessContext().isTierFeatureEnabled(Feature.BASIC_ANALYTICS);
  const advancedOk = useDataAccessContext().isTierFeatureEnabled(Feature.ADVANCED_ANALYTICS);
  const tierOk = basicOk && advancedOk;
  return useAPIQuery<AnalyticsAppointmentMetricsResponse>(
    queryKeys.analytics.appointmentMetrics(
      clinicId,
      period,
      startDate?.toISOString() || "",
      endDate?.toISOString() || "",
    ),
    `/analytics/appointment-metrics${buildQueryString({
      ...( { clinicId, period } as AnalyticsPeriodDateRangeQuery),
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    })}`,
    { staleTime: 1000 * 60 * 5, enabled: tierOk },
  );
};

export const usePatientDemographics = (
  clinicId: string,
  startDate?: Date,
  endDate?: Date,
) => {
  const basicOk = useDataAccessContext().isTierFeatureEnabled(Feature.BASIC_ANALYTICS);
  const advancedOk = useDataAccessContext().isTierFeatureEnabled(Feature.ADVANCED_ANALYTICS);
  const tierOk = basicOk && advancedOk;
  return useAPIQuery<AnalyticsPatientDemographicsResponse>(
    queryKeys.analytics.patientDemographics(
      clinicId,
      startDate?.toISOString() || "",
      endDate?.toISOString() || "",
    ),
    `/analytics/patient-demographics${buildQueryString({
      ...( { clinicId } as AnalyticsDateRangeQuery),
      startDate: startDate?.toISOString(),
      endDate: endDate?.toISOString(),
    })}`,
    { staleTime: 1000 * 60 * 5, enabled: tierOk },
  );
};

export const useTopConditions = (clinicId: string, limit: number = 10) => {
  const basicOk = useDataAccessContext().isTierFeatureEnabled(Feature.BASIC_ANALYTICS);
  return useAPIQuery<AnalyticsTopConditionListResponse>(
    queryKeys.analytics.topConditions(clinicId, limit),
    `/analytics/top-conditions${buildQueryString({
      ...( { clinicId, limit } as AnalyticsLimitQuery),
    })}`,
    { staleTime: 1000 * 60 * 5, enabled: basicOk },
  );
};

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
    Error
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
    queryKeys.analytics.auditLogs({
      clinicId: clinicId || "",
      actionType: actionType || "",
      startDate: startDate?.toISOString() || "",
      endDate: endDate?.toISOString() || "",
    }),
    `/audit-logs?${clinicId ? `clinicId=${clinicId}&` : ""}${actionType ? `actionType=${actionType}&` : ""}${startDate ? `startDate=${startDate.toISOString()}&` : ""}${endDate ? `endDate=${endDate.toISOString()}` : ""}`,
    { staleTime: 1000 * 60, ...options },
  );
