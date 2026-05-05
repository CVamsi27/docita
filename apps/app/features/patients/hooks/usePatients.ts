"use client";

import { useQuery } from "@tanstack/react-query";
import { patientsApi } from "@/features/patients/api/patients.api";
import {
  Feature,
  type CreateMetricCategoryInput,
  type CreateMetricDefinitionInput,
  type CreatePatientInput,
  type CreatePatientMetricValueInput,
  type MetricHistoryQueryInput,
  type UpdatePatientInput,
  type UpsertMetricSelectionsInput,
} from "@workspace/types";
import { queryKeys } from "@workspace/data-access";
import { useAppMutation } from "@/lib/query-hooks";
import { useTierFeatureEnabled } from "@/hooks/api/tier-feature-guards";

export function usePatients(params?: {
  limit?: number;
  page?: number;
  search?: string;
}) {
  const tierPatientsOk = useTierFeatureEnabled(Feature.BASIC_PATIENT_MANAGEMENT);
  return useQuery({
    queryKey: queryKeys.patients.list(params),
    queryFn: () => patientsApi.getAll(params),
    enabled: tierPatientsOk,
  });
}

export function usePatient(id: string) {
  const tierPatientsOk = useTierFeatureEnabled(Feature.BASIC_PATIENT_MANAGEMENT);
  return useQuery({
    queryKey: queryKeys.patients.detail(id),
    queryFn: () => patientsApi.getById(id),
    enabled: tierPatientsOk && !!id,
  });
}

export function usePatientMedicalHistory(id: string) {
  const tierPatientsOk = useTierFeatureEnabled(Feature.BASIC_PATIENT_MANAGEMENT);
  return useQuery({
    queryKey: queryKeys.patients.medicalHistory(id),
    queryFn: () => patientsApi.getMedicalHistory(id),
    enabled: tierPatientsOk && !!id,
  });
}

export function usePatientMetricCategories(id: string) {
  const tierPatientsOk = useTierFeatureEnabled(Feature.BASIC_PATIENT_MANAGEMENT);
  return useQuery({
    queryKey: queryKeys.patients.metrics.categories(id),
    queryFn: () => patientsApi.getMetricCategories(id),
    enabled: tierPatientsOk && !!id,
  });
}

export function usePatientMetricHistory(
  id: string,
  query?: MetricHistoryQueryInput,
) {
  const tierPatientsOk = useTierFeatureEnabled(Feature.BASIC_PATIENT_MANAGEMENT);
  return useQuery({
    queryKey: queryKeys.patients.metrics.history(id, query),
    queryFn: () => patientsApi.getMetricHistory(id, query),
    enabled: tierPatientsOk && !!id,
  });
}

export function usePatientSelectedMetrics(id: string) {
  const tierPatientsOk = useTierFeatureEnabled(Feature.BASIC_PATIENT_MANAGEMENT);
  return useQuery({
    queryKey: queryKeys.patients.metrics.selected(id),
    queryFn: () => patientsApi.getSelectedMetrics(id),
    enabled: tierPatientsOk && !!id,
  });
}

export function useCreatePatientMetricCategory(id: string) {
  return useAppMutation({
    mutationFn: (data: CreateMetricCategoryInput) =>
      patientsApi.createMetricCategory(id, data),
    invalidateKeys: [queryKeys.patients.metrics.categories(id)],
    successMessage: "Metric category added",
    errorMessage: "We could not add this metric category. Please try again.",
  });
}

export function useCreatePatientMetricDefinition(id: string) {
  return useAppMutation({
    mutationFn: (data: CreateMetricDefinitionInput) =>
      patientsApi.createMetricDefinition(id, data),
    invalidateKeys: [
      queryKeys.patients.metrics.categories(id),
      queryKeys.patients.metrics.selected(id),
    ],
    successMessage: "Metric definition added",
    errorMessage: "We could not add this metric. Please try again.",
  });
}

export function useUpdatePatientSelectedMetrics(id: string) {
  return useAppMutation({
    mutationFn: (data: UpsertMetricSelectionsInput) =>
      patientsApi.updateSelectedMetrics(id, data),
    invalidateKeys: [queryKeys.patients.metrics.selected(id)],
    successMessage: "Tracked metrics updated",
    errorMessage:
      "We could not update this patient's tracked metrics. Please try again.",
  });
}

export function useRecordPatientMetricValue(id: string) {
  return useAppMutation({
    mutationFn: (data: CreatePatientMetricValueInput) =>
      patientsApi.recordMetricValue(id, data),
    invalidateKeys: [queryKeys.patients.metrics.historyRoot(id)],
    successMessage: "Metric value recorded",
    errorMessage: "We could not save this metric value. Please try again.",
  });
}

export function useCreatePatient() {
  return useAppMutation({
    mutationFn: (data: CreatePatientInput) => patientsApi.create(data),
    invalidateKeys: [queryKeys.patients.all()],
    successMessage: "Patient created successfully",
    errorMessage: "We could not add this patient. Please try again.",
  });
}

export function useUpdatePatient(id: string) {
  return useAppMutation({
    mutationFn: (data: UpdatePatientInput) => patientsApi.update(id, data),
    invalidateKeys: [queryKeys.patients.all(), queryKeys.patients.detail(id)],
    successMessage: "Patient updated successfully",
    errorMessage: "We could not update this patient. Please try again.",
  });
}

export function useDeletePatient(id: string) {
  return useAppMutation({
    mutationFn: () => patientsApi.delete(id),
    invalidateKeys: [queryKeys.patients.all()],
    successMessage: "Patient deleted successfully",
    errorMessage: "We could not remove this patient. Please try again.",
  });
}
