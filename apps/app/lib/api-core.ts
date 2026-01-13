import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
  UseQueryOptions,
} from "@tanstack/react-query";
import { API_URL } from "./api-config";

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

  // Don't set Content-Type for FormData - browser will set it automatically with boundary
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
    });

    if (!response.ok) {
      // Handle 401 Unauthorized - token is invalid or expired
      if (response.status === 401) {
        handleAuthError();
        throw new Error("Session expired. Please log in again.");
      }

      // Handle other errors
      const error = await response
        .json()
        .catch(() => ({ message: "An error occurred" }));
      throw new Error(
        error.message || `HTTP error! status: ${response.status}`,
      );
    }

    return response.json();
  } catch (error) {
    // Re-throw with better error messaging
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to fetch from API");
  }
}

export function useAPIQuery<T>(
  key: unknown[],
  endpoint: string,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">,
) {
  return useQuery<T>({
    queryKey: key,
    queryFn: () => fetchAPI<T>(endpoint),
    enabled: true, // Default to enabled, can be overridden in options
    ...options,
  });
}

export function useAPIMutation<TData, TVariables>(
  endpoint: string | ((variables: TVariables) => string),
  method: "POST" | "PUT" | "DELETE" | "PATCH" = "POST",
  options?: UseMutationOptions<TData, Error, TVariables>,
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
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
    onSuccess: () => {
      // Invalidate all queries but wait for refetch to complete
      void queryClient.invalidateQueries({});
    },
    ...options,
  });
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  count: number;
}
