import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { APIRequestError } from "@workspace/data-access";
import { getUserFacingErrorMessage } from "@workspace/types";
import { API_URL } from "./api-config";
import { apiFetch } from "./api-client";
import { ApiError } from "./errors";

export { API_URL };

export interface AppConstants {
  followUpTypes: Array<{ value: string; label: string }>;
  reminderDays: Array<{ value: number; label: string }>;
  inventoryCategories: Array<{ value: string; label: string }>;
  queueStatuses: Array<{ value: string; label: string }>;
  wardTypes: Array<{ value: string; label: string }>;
  availableBeds: Array<{ value: string; label: string }>;
  teethQuadrants: Record<string, number[]>;
  toothConditions: Array<{ value: string; label: string; color: string }>;
}

export interface FormOptions {
  gender: { value: string; label: string }[];
  bloodGroup: { value: string; label: string }[];
  appointmentType: { value: string; label: string }[];
  appointmentStatus: { value: string; label: string }[];
  invoiceStatus: { value: string; label: string }[];
  paymentStatus: { value: string; label: string }[];
  userRole: { value: string; label: string }[];
  weekday: { value: string; label: string }[];
  customFieldType: { value: string; label: string }[];
  templateFieldType: { value: string; label: string }[];
  specialty: { value: string; label: string }[];
  documentType: { value: string; label: string }[];
  appointmentDuration: { value: number; label: string }[];
  whatsappMessageType: { value: string; label: string }[];
  currency: { value: string; label: string }[];
  timezone: { value: string; label: string }[];
}

export interface PaginatedResponse<T> {
  items: T[];
  count: number;
  hasMore: boolean;
  nextCursor?: string | null;
}

export interface MedicalHistoryTimelineItem {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  type: string;
  chiefComplaint: string | null;
  encounterSummary: string | null;
  provisionalDiagnosis: string | null;
  finalDiagnosis: string | null;
  clinicalImpression: string | null;
  treatmentPlan: string | null;
  observations: string | null;
  notes: string | null;
  doctor: {
    id: string;
    name: string;
    specialization: string | null;
  } | null;
  diagnoses: Array<{
    id: string;
    isPrimary: boolean;
    notes: string | null;
    icdCode: {
      id: string;
      code: string;
      description: string;
    } | null;
  }>;
  vitalSign: {
    id: string;
    systolicBP: number | null;
    diastolicBP: number | null;
    bloodPressure: string | null;
    pulse: number | null;
    temperature: number | null;
    spo2: number | null;
    weight: number | null;
    height: number | null;
  } | null;
  prescription: {
    id: string;
    medications: Array<{
      id: string;
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
    }>;
  } | null;
  issueSummary: string;
  primaryDiagnosis: {
    id: string;
    isPrimary: boolean;
    notes: string | null;
    icdCode: {
      id: string;
      code: string;
      description: string;
    } | null;
  } | null;
  yearMonth: string;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return Object.fromEntries(Object.entries(value));
}

export async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  try {
    return await apiFetch<T>(endpoint, options);
  } catch (error) {
    if (error instanceof APIRequestError) {
      throw new ApiError(
        getUserFacingErrorMessage(error, {
          fallback: "Please review the information on this screen and try again.",
        }),
        error.status ?? 500,
        error.code ?? "API_ERROR",
        toRecord(error.data ?? undefined) ?? undefined,
      );
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      getUserFacingErrorMessage(error, {
        fallback: "We could not load this right now. Please refresh or try again.",
        context: "load",
      }),
      500,
      "NETWORK_ERROR",
    );
  }
}

const STALE_TIME_BY_KEY_PREFIX: Record<string, number> = {
  patients: 60 * 1000,
  appointments: 60 * 1000,
  invoices: 60 * 1000,
  prescriptions: 60 * 1000,
  dashboard: 30 * 1000,
  analytics: 30 * 1000,
  "appointment-queue": 15 * 1000,
  doctors: 5 * 60 * 1000,
  clinic: 5 * 60 * 1000,
  "doctor-profile": 5 * 60 * 1000,
  settings: 5 * 60 * 1000,
  permissions: 5 * 60 * 1000,
};

function inferStaleTime(
  key: readonly (string | number | Record<string, unknown>)[],
): number | undefined {
  const prefix = typeof key[0] === "string" ? key[0] : undefined;
  if (!prefix) return undefined;
  return STALE_TIME_BY_KEY_PREFIX[prefix];
}

export function useAPIQuery<T>(
  key: readonly (string | number | Record<string, unknown>)[],
  endpoint: string,
  options?: Omit<UseQueryOptions<T, ApiError>, "queryKey" | "queryFn">,
) {
  const inferredStaleTime = options?.staleTime === undefined ? inferStaleTime(key) : undefined;
  return useQuery<T, ApiError>({
    queryKey: key,
    queryFn: () => fetchAPI<T>(endpoint),
    ...(inferredStaleTime !== undefined ? { staleTime: inferredStaleTime } : {}),
    ...options,
  });
}

export function useAPIMutation<TData, TVariables>(
  endpointOrFn: string | ((vars: TVariables) => string),
  method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST",
  options?: Omit<UseMutationOptions<TData, ApiError, TVariables>, "mutationFn"> & {
    invalidateKeys?: readonly (
      readonly (string | number | Record<string, unknown>)[]
    )[];
  },
) {
  const queryClient = useQueryClient();

  return useMutation<TData, ApiError, TVariables>({
    mutationFn: (variables: TVariables) => {
      const endpoint =
        typeof endpointOrFn === "function"
          ? endpointOrFn(variables)
          : endpointOrFn;
      return fetchAPI<TData>(endpoint, {
        method,
        body: variables ? JSON.stringify(variables) : undefined,
      });
    },
    ...options,
    onSuccess: (data, variables, context) => {
      if (options?.invalidateKeys) {
        options.invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
      if (options?.onSuccess) {
        const typedOnSuccess = options.onSuccess as (
          data: TData,
          variables: TVariables,
          context?: unknown,
        ) => Promise<void> | void;
        typedOnSuccess(data, variables, context);
      }
    },
  });
}
