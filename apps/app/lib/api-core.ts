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

/**
 * Global App Constants
 */
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

/**
 * Medical History Timeline Item - represents a single appointment in the patient's medical history
 */
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
  // Computed fields from backend
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
  // Clear invalid token
  if (typeof window !== "undefined") {
    localStorage.removeItem("docita_token");
    localStorage.removeItem("docita_user");
    // Redirect to login
    const currentPath = window.location.pathname;
    if (currentPath !== "/login") {
      sessionStorage.setItem("redirectAfterLogin", currentPath);
      window.location.href = "/login";
    }
  }
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

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      // Handle 401 Unauthorized - token is invalid or expired
      if (response.status === 401) {
        handleAuthError();
        throw new ApiError(
          "Session expired. Please log in again.",
          401,
          "UNAUTHORIZED",
        );
      }

      // Handle other errors
      let errorData;
      try {
        errorData = await response.json();
      } catch (_e) {
        errorData = { message: `HTTP error! status: ${response.status}` };
      }

      throw new ApiError(
        errorData.message || `HTTP error! status: ${response.status}`,
        response.status,
        errorData.code || "API_ERROR",
        errorData.details,
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

export function useAPIQuery<T>(
  key: (string | number | Record<string, unknown>)[],
  endpoint: string,
  options?: Omit<UseQueryOptions<T, ApiError>, "queryKey" | "queryFn">,
) {
  return useQuery<T, ApiError>({
    queryKey: key,
    queryFn: () => fetchAPI<T>(endpoint),
    ...options,
  });
}

export function useAPIMutation<TData, TVariables>(
  endpoint: string | ((variables: TVariables) => string),
  method: "POST" | "PUT" | "DELETE" | "PATCH" = "POST",
  options?: UseMutationOptions<TData, ApiError, TVariables> & {
    invalidateKeys?: Array<(string | number | Record<string, unknown>)[]>;
  },
) {
  const queryClient = useQueryClient();

  return useMutation<TData, ApiError, TVariables>({
    mutationFn: (variables) => {
      const url =
        typeof endpoint === "function" ? endpoint(variables) : endpoint;

      // Handle FormData - don't stringify it
      const body =
        variables instanceof FormData ? variables : JSON.stringify(variables);

      return fetchAPI<TData>(url, {
        method,
        body,
      });
    },
    ...options,
    onSuccess: async (data, variables, context, mutationContext) => {
      if (options?.invalidateKeys) {
        await Promise.all(
          options.invalidateKeys.map((key) =>
            queryClient.invalidateQueries({ queryKey: key }),
          ),
        );
      }
      // Blanket invalidation removed as per §9.2 for better performance

      if (options?.onSuccess) {
        await options.onSuccess(data, variables, context, mutationContext);
      }
    },
  });
}
