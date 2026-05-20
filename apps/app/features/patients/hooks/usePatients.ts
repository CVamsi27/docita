"use client";

import type { UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useCreatePatient as useCreatePatientBase,
  useCreatePatientMetricCategory as useCreatePatientMetricCategoryBase,
  useCreatePatientMetricDefinition as useCreatePatientMetricDefinitionBase,
  useDeletePatient as useDeletePatientBase,
  usePatient as usePatientBase,
  usePatientMedicalHistoryTimeline,
  usePatientMetricCategories as usePatientMetricCategoriesBase,
  usePatientMetricHistory as usePatientMetricHistoryBase,
  usePatientSelectedMetrics as usePatientSelectedMetricsBase,
  usePatients as usePatientsBase,
  useRecordPatientMetricValue as useRecordPatientMetricValueBase,
  useUpdatePatient as useUpdatePatientBase,
  useUpdatePatientSelectedMetrics as useUpdatePatientSelectedMetricsBase,
} from "@workspace/data-access";
import type {
  CreateMetricCategoryInput,
  CreateMetricDefinitionInput,
  CreatePatientMetricValueInput,
  CreatePatientRequest,
  MetricCategoryResponse,
  MetricDefinitionResponse,
  MetricHistoryQueryInput,
  MetricRecordResponse,
  Patient,
  UpdatePatientRequest,
} from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

export const usePatients = usePatientsBase;
export const usePatient = usePatientBase;
export const usePatientMetricCategories = usePatientMetricCategoriesBase;
export const usePatientMetricHistory = usePatientMetricHistoryBase;
export const usePatientSelectedMetrics = usePatientSelectedMetricsBase;

/** @deprecated Prefer `usePatientMedicalHistoryTimeline` from `@workspace/data-access`. */
export const usePatientMedicalHistory = usePatientMedicalHistoryTimeline;

function wrapMutationWithToasts<TData, TVariables>(
  mutation: UseMutationResult<TData, Error, TVariables>,
  messages: { success: string; error: string },
): UseMutationResult<TData, Error, TVariables> {
  return {
    ...mutation,
    mutate: (variables, options) =>
      mutation.mutate(variables, {
        ...options,
        onSuccess: (data, vars, onMutateResult, context) => {
          toast.success(messages.success);
          options?.onSuccess?.(data, vars, onMutateResult, context);
        },
        onError: (error, vars, onMutateResult, context) => {
          showUserFacingErrorToast(error, messages.error, "save");
          options?.onError?.(error, vars, onMutateResult, context);
        },
      }),
    mutateAsync: async (variables, options) => {
      try {
        const data = await mutation.mutateAsync(variables, options);
        toast.success(messages.success);
        return data;
      } catch (error) {
        showUserFacingErrorToast(error, messages.error, "save");
        throw error;
      }
    },
  };
}

export function useCreatePatientMetricCategory(patientId: string) {
  return wrapMutationWithToasts(useCreatePatientMetricCategoryBase(patientId), {
    success: "Metric category added",
    error: "We could not add this metric category. Please try again.",
  });
}

export function useCreatePatientMetricDefinition(patientId: string) {
  return wrapMutationWithToasts(
    useCreatePatientMetricDefinitionBase(patientId),
    {
      success: "Metric definition added",
      error: "We could not add this metric. Please try again.",
    },
  );
}

export function useUpdatePatientSelectedMetrics(patientId: string) {
  return wrapMutationWithToasts(
    useUpdatePatientSelectedMetricsBase(patientId),
    {
      success: "Tracked metrics updated",
      error:
        "We could not update this patient's tracked metrics. Please try again.",
    },
  );
}

export function useRecordPatientMetricValue(patientId: string) {
  return wrapMutationWithToasts(useRecordPatientMetricValueBase(patientId), {
    success: "Metric value recorded",
    error: "We could not save this metric value. Please try again.",
  });
}

export function useCreatePatient() {
  return wrapMutationWithToasts<Patient, CreatePatientRequest>(
    useCreatePatientBase(),
    {
      success: "Patient created successfully",
      error: "We could not add this patient. Please try again.",
    },
  );
}

export function useUpdatePatient(patientId: string) {
  return wrapMutationWithToasts<Patient, UpdatePatientRequest>(
    useUpdatePatientBase(patientId),
    {
      success: "Patient updated successfully",
      error: "We could not update this patient. Please try again.",
    },
  );
}

export function useDeletePatient(patientId: string) {
  return wrapMutationWithToasts<void, void>(useDeletePatientBase(patientId), {
    success: "Patient deleted successfully",
    error: "We could not remove this patient. Please try again.",
  });
}

export type {
  CreateMetricCategoryInput,
  CreateMetricDefinitionInput,
  CreatePatientMetricValueInput,
  MetricCategoryResponse,
  MetricDefinitionResponse,
  MetricHistoryQueryInput,
  MetricRecordResponse,
};
