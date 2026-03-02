import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { patientsApi } from "@/features/patients/api/patients.api";
import type { CreatePatientInput, UpdatePatientInput } from "@workspace/types";
import { toast } from "sonner";
import type {
  PatientMetricCategoryInput,
  PatientMetricDefinitionInput,
  PatientMetricHistoryQuery,
  RecordPatientMetricValueInput,
  UpsertPatientMetricSelectionsInput,
} from "@/features/patients/api/patients.api";

export function usePatients(params?: { limit?: number; search?: string }) {
  return useQuery({
    queryKey: ["patients", params],
    queryFn: () => patientsApi.getAll(params),
  });
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ["patients", id],
    queryFn: () => patientsApi.getById(id),
    enabled: !!id,
  });
}

export function usePatientMedicalHistory(id: string) {
  return useQuery({
    queryKey: ["patients", id, "medical-history"],
    queryFn: () => patientsApi.getMedicalHistory(id),
    enabled: !!id,
  });
}

export function usePatientMetricCategories(id: string) {
  return useQuery({
    queryKey: ["patients", id, "metrics", "categories"],
    queryFn: () => patientsApi.getMetricCategories(id),
    enabled: !!id,
  });
}

export function usePatientMetricHistory(
  id: string,
  query?: PatientMetricHistoryQuery,
) {
  return useQuery({
    queryKey: ["patients", id, "metrics", "history", query],
    queryFn: () => patientsApi.getMetricHistory(id, query),
    enabled: !!id,
  });
}

export function usePatientSelectedMetrics(id: string) {
  return useQuery({
    queryKey: ["patients", id, "metrics", "selected"],
    queryFn: () => patientsApi.getSelectedMetrics(id),
    enabled: !!id,
  });
}

export function useCreatePatientMetricCategory(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PatientMetricCategoryInput) =>
      patientsApi.createMetricCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["patients", id, "metrics", "categories"],
      });
      toast.success("Metric category added");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create metric category");
    },
  });
}

export function useCreatePatientMetricDefinition(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PatientMetricDefinitionInput) =>
      patientsApi.createMetricDefinition(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["patients", id, "metrics", "categories"],
      });
      queryClient.invalidateQueries({
        queryKey: ["patients", id, "metrics", "selected"],
      });
      toast.success("Metric definition added");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create metric definition");
    },
  });
}

export function useUpdatePatientSelectedMetrics(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpsertPatientMetricSelectionsInput) =>
      patientsApi.updateSelectedMetrics(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["patients", id, "metrics", "selected"],
      });
      toast.success("Tracked metrics updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update tracked metrics");
    },
  });
}

export function useRecordPatientMetricValue(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RecordPatientMetricValueInput) =>
      patientsApi.recordMetricValue(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["patients", id, "metrics", "history"],
      });
      toast.success("Metric value recorded");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to record metric value");
    },
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePatientInput) => patientsApi.create(data),
    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create patient");
    },
  });
}

export function useUpdatePatient(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePatientInput) => patientsApi.update(id, data),
    onSuccess: () => {

      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patients", id] });
      toast.success("Patient updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update patient");
    },
  });
}

export function useDeletePatient(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => patientsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete patient");
    },
  });
}
