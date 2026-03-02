

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_ENDPOINTS, apiFetch } from "@/lib/api";

export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  age: number;
  gender: string;
  createdAt: Date;
}

export interface PatientsFilter {
  search?: string;
  status?: "active" | "inactive";
  page?: number;
  limit?: number;
}

export function usePatients(filters?: PatientsFilter) {
  const queryClient = useQueryClient();

  const patientsQuery = useQuery({
    queryKey: ["patients", filters],
    queryFn: () =>
      apiFetch<{ data: Patient[]; total: number }>(
        API_ENDPOINTS.patients.list,
        {
          params: filters as Record<string, string | number | boolean>,
        },
      ),
    enabled: true,
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Patient, "id" | "createdAt">) =>
      apiFetch<Patient>(API_ENDPOINTS.patients.create, {
        method: "POST",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<Patient> & { id: string }) =>
      apiFetch<Patient>(API_ENDPOINTS.patients.update(id), {
        method: "PATCH",
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(API_ENDPOINTS.patients.delete(id), {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patients"] });
    },
  });

  return {

    patients: patientsQuery.data?.data || [],
    total: patientsQuery.data?.total || 0,
    isLoading: patientsQuery.isLoading,
    error: patientsQuery.error,

    createPatient: createMutation.mutateAsync,
    updatePatient: updateMutation.mutateAsync,
    deletePatient: deleteMutation.mutateAsync,

    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    refetch: patientsQuery.refetch,
  };
}

export function usePatient(id: string) {
  const patientQuery = useQuery({
    queryKey: ["patient", id],
    queryFn: () => apiFetch<Patient>(API_ENDPOINTS.patients.get(id)),
    enabled: !!id,
  });

  return {
    patient: patientQuery.data,
    isLoading: patientQuery.isLoading,
    error: patientQuery.error,
    refetch: patientQuery.refetch,
  };
}
