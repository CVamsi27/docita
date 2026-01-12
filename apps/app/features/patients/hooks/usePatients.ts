import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { patientsApi } from "../api/patients.api";
import type { CreatePatientInput, UpdatePatientInput } from "@workspace/types";
import { toast } from "sonner";

/**
 * React Query hooks for patient operations
 */

/**
 * Fetch all patients with optional filters
 */
export function usePatients(params?: { limit?: number; search?: string }) {
  return useQuery({
    queryKey: ["patients", params],
    queryFn: () => patientsApi.getAll(params),
  });
}

/**
 * Fetch a single patient by ID
 */
export function usePatient(id: string) {
  return useQuery({
    queryKey: ["patients", id],
    queryFn: () => patientsApi.getById(id),
    enabled: !!id,
  });
}

/**
 * Fetch patient's medical history
 */
export function usePatientMedicalHistory(id: string) {
  return useQuery({
    queryKey: ["patients", id, "medical-history"],
    queryFn: () => patientsApi.getMedicalHistory(id),
    enabled: !!id,
  });
}

/**
 * Create a new patient
 */
export function useCreatePatient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePatientInput) => patientsApi.create(data),
    onSuccess: () => {
      // Invalidate patients list to refetch
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      toast.success("Patient created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create patient");
    },
  });
}

/**
 * Update an existing patient
 */
export function useUpdatePatient(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdatePatientInput) => patientsApi.update(id, data),
    onSuccess: () => {
      // Invalidate both the list and the specific patient
      queryClient.invalidateQueries({ queryKey: ["patients"] });
      queryClient.invalidateQueries({ queryKey: ["patients", id] });
      toast.success("Patient updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update patient");
    },
  });
}

/**
 * Delete a patient
 */
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
