import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { API_URL } from "./api-config";
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

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("docita_token");
}

export function handleAuthError() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("docita_token");
    localStorage.removeItem("docita_user");
    const currentPath = window.location.pathname;
    if (currentPath !== "/login") {
      sessionStorage.setItem("redirectAfterLogin", currentPath);
      window.location.href = "/login";
    }
  }
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
  const token = getAuthToken();

  const headers: HeadersInit = {
    ...(!(options?.body instanceof FormData) && {
      "Content-Type": "application/json",
    }),
    ...options?.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  // Add CSRF token from cookie for cookie-based CSRF protection
  const csrfToken =
    typeof document !== "undefined"
      ? document.cookie
          .split("; ")
          .find((row) => row.startsWith("XSRF-TOKEN="))
          ?.split("=")[1]
      : null;

  if (csrfToken) {
    (headers as Record<string, string>)["X-XSRF-TOKEN"] = decodeURIComponent(
      csrfToken,
    );
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      if (response.status === 401) {
        handleAuthError();
        throw new ApiError(
          "Session expired. Please log in again.",
          401,
          "UNAUTHORIZED",
        );
      }

      let errorData: unknown;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: `HTTP error! status: ${response.status}` };
      }

      const errObj = toRecord(errorData) ?? {};
      const message = typeof errObj.message === "string"
        ? errObj.message
        : `HTTP error! status: ${response.status}`;
      const code = typeof errObj.code === "string" ? errObj.code : undefined;
      const details = toRecord(errObj.details) ?? undefined;

      if (response.status === 403 && typeof window !== "undefined") {
        if (code === "SUBSCRIPTION_INACTIVE" || code === "INSUFFICIENT_TIER") {
          window.location.href = "/settings/billing";
        } else if (code === "NO_CLINIC") {
          window.location.href = "/choose-path";
        }
      }

      throw new ApiError(
        message,
        response.status,
        code || "API_ERROR",
        details,
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Failed to fetch from API",
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

function inferStaleTime(key: (string | number | Record<string, unknown>)[]): number | undefined {
  const prefix = typeof key[0] === "string" ? key[0] : undefined;
  if (!prefix) return undefined;
  return STALE_TIME_BY_KEY_PREFIX[prefix];
}

export function useAPIQuery<T>(
  key: (string | number | Record<string, unknown>)[],
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
    invalidateKeys?: (string | number | Record<string, unknown>)[][];
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
