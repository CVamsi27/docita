"use client";

import { z } from "zod";
import {
  createMetricCategorySchema,
  createMetricDefinitionSchema,
  createPatientMetricValueSchema,
  metricCategoryResponseSchema,
  metricDefinitionResponseSchema,
  metricHistoryQuerySchema,
  metricHistoryResponseSchema,
  metricRecordResponseSchema,
  upsertMetricSelectionsSchema,
  type CreateMetricCategoryInput,
  type CreateMetricDefinitionInput,
  CreatePatientMetricValueInput,
  Feature,
  type MetricCategoryResponse,
  type MetricDefinitionResponse,
  type MetricHistoryQueryInput,
  type MetricHistoryResponse,
  type MetricRecordResponse,
  type UpsertMetricSelectionsInput,
} from "@workspace/types";
import { useAPIQueryValidated } from "../core/use-api-query-validated";
import { useAPIMutation } from "../core/use-api-mutation";
import { queryKeys } from "../lib/query-keys";
import { withQueryString } from "../lib/query-string";
import { useDataAccessContext } from "../provider/hooks";

const metricCategoriesSchema = z.array(metricCategoryResponseSchema);
const metricDefinitionsSchema = z.array(metricDefinitionResponseSchema);

export function usePatientMetricCategories(patientId: string) {
  const tierPatientsOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.BASIC_PATIENT_MANAGEMENT,
  );
  return useAPIQueryValidated(
    queryKeys.patients.metrics.categories(patientId),
    `/patients/${patientId}/metrics/categories`,
    metricCategoriesSchema,
    { enabled: tierPatientsOk && patientId.length > 0 },
  );
}

export function usePatientMetricHistory(
  patientId: string,
  query?: MetricHistoryQueryInput,
) {
  const tierPatientsOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.BASIC_PATIENT_MANAGEMENT,
  );
  const parsedQuery = query ? metricHistoryQuerySchema.parse(query) : undefined;
  return useAPIQueryValidated(
    queryKeys.patients.metrics.history(patientId, parsedQuery),
    withQueryString(`/patients/${patientId}/metrics/history`, parsedQuery),
    metricHistoryResponseSchema,
    { enabled: tierPatientsOk && patientId.length > 0 },
  );
}

export function usePatientSelectedMetrics(patientId: string) {
  const tierPatientsOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.BASIC_PATIENT_MANAGEMENT,
  );
  return useAPIQueryValidated(
    queryKeys.patients.metrics.selected(patientId),
    `/patients/${patientId}/metrics/selected`,
    metricDefinitionsSchema,
    { enabled: tierPatientsOk && patientId.length > 0 },
  );
}

export function useCreatePatientMetricCategory(patientId: string) {
  return useAPIMutation<MetricCategoryResponse, CreateMetricCategoryInput>(
    `/patients/${patientId}/metrics/categories`,
    "POST",
    {
      body: (data) => createMetricCategorySchema.parse(data),
      invalidateKeys: [queryKeys.patients.metrics.categories(patientId)],
    },
  );
}

export function useCreatePatientMetricDefinition(patientId: string) {
  return useAPIMutation<MetricDefinitionResponse, CreateMetricDefinitionInput>(
    `/patients/${patientId}/metrics/definitions`,
    "POST",
    {
      body: (data) => createMetricDefinitionSchema.parse(data),
      invalidateKeys: [
        queryKeys.patients.metrics.categories(patientId),
        queryKeys.patients.metrics.selected(patientId),
      ],
    },
  );
}

export function useUpdatePatientSelectedMetrics(patientId: string) {
  return useAPIMutation<MetricDefinitionResponse[], UpsertMetricSelectionsInput>(
    `/patients/${patientId}/metrics/selected`,
    "PUT",
    {
      body: (data) => upsertMetricSelectionsSchema.parse(data),
      invalidateKeys: [queryKeys.patients.metrics.selected(patientId)],
    },
  );
}

export function useRecordPatientMetricValue(patientId: string) {
  return useAPIMutation<MetricRecordResponse, CreatePatientMetricValueInput>(
    `/patients/${patientId}/metrics/values`,
    "POST",
    {
      body: (data) => createPatientMetricValueSchema.parse(data),
      invalidateKeys: [queryKeys.patients.metrics.historyRoot(patientId)],
    },
  );
}

export type {
  MetricCategoryResponse,
  MetricDefinitionResponse,
  MetricHistoryResponse,
  MetricRecordResponse,
};
