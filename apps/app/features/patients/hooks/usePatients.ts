import { useQuery } from "@tanstack/react-query";
import { patientsApi } from "@/features/patients/api/patients.api";
import type { CreatePatientInput, UpdatePatientInput } from "@workspace/types";
import type {
  PatientMetricCategoryInput,
  PatientMetricDefinitionInput,
  PatientMetricHistoryQuery,
  RecordPatientMetricValueInput,
  UpsertPatientMetricSelectionsInput,
} from "@/features/patients/api/patients.api";
import { queryKeys } from "@workspace/data-access";
import { useAppMutation } from "@/lib/query-hooks";

export function usePatients(params?: {
  limit?: number;
  page?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: queryKeys.patients.list(params),
    queryFn: () => patientsApi.getAll(params),
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: queryKeys.patients.detail(id),
    queryFn: () => patientsApi.getById(id),
    enabled: !!id,
  });
}

export function usePatientMedicalHistory(id: string) {
  return useQuery({
    queryKey: queryKeys.patients.medicalHistory(id),
    queryFn: () => patientsApi.getMedicalHistory(id),
    enabled: !!id,
  });
}

export function usePatientMetricCategories(id: string) {
  return useQuery({
    queryKey: queryKeys.patients.metrics.categories(id),
    queryFn: () => patientsApi.getMetricCategories(id),
    enabled: !!id,
  });
}

export function usePatientMetricHistory(
  id: string,
  query?: PatientMetricHistoryQuery,
) {
  return useQuery({
    queryKey: queryKeys.patients.metrics.history(id, query),
    queryFn: () => patientsApi.getMetricHistory(id, query),
    enabled: !!id,
  });
}

export function usePatientSelectedMetrics(id: string) {
  return useQuery({
    queryKey: queryKeys.patients.metrics.selected(id),
    queryFn: () => patientsApi.getSelectedMetrics(id),
    enabled: !!id,
  });
}

export function useCreatePatientMetricCategory(id: string) {
  return useAppMutation({
    mutationFn: (data: PatientMetricCategoryInput) =>
      patientsApi.createMetricCategory(id, data),
    invalidateKeys: [queryKeys.patients.metrics.categories(id)],
    successMessage: "Metric category added",
    errorMessage: "We could not add this metric category. Please try again.",
  });
}

export function useCreatePatientMetricDefinition(id: string) {
  return useAppMutation({
    mutationFn: (data: PatientMetricDefinitionInput) =>
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
    mutationFn: (data: UpsertPatientMetricSelectionsInput) =>
      patientsApi.updateSelectedMetrics(id, data),
    invalidateKeys: [queryKeys.patients.metrics.selected(id)],
    successMessage: "Tracked metrics updated",
    errorMessage: "We could not update this patient's tracked metrics. Please try again.",
  });
}

export function useRecordPatientMetricValue(id: string) {
  return useAppMutation({
    mutationFn: (data: RecordPatientMetricValueInput) =>
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
