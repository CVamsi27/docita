import { toast } from "sonner";
import { z } from "zod";
import {
  API_ROUTES,
  AppErrorCode,
  ERROR_MESSAGES,
  PaginatedResponse,
} from "@workspace/types";

/**
 * Configuration for API requests
 */
interface ApiRequestConfig extends RequestInit {
  retries?: number;
  retryDelay?: number;
  showErrorToast?: boolean;
}

/**
 * Custom error class for API errors with error codes
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: AppErrorCode,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /**
   * Get user-friendly message for this error
   */
  getUserMessage(): string {
    if (this.code && ERROR_MESSAGES[this.code]) {
      return ERROR_MESSAGES[this.code];
    }
    return this.message;
  }
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Get authentication token from localStorage
 */
const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("docita_token");
};

/**
 * Enhanced fetch with retry logic, error handling, and error code support
 *
 * @param url - API endpoint URL
 * @param config - Request configuration with retry options
 * @returns Promise with typed response
 *
 * @example
 * const data = await apiFetch<Patient[]>('/patients')
 * const patient = await apiFetch<Patient>('/patients/123')
 */
export async function apiFetch<T = unknown>(
  url: string,
  config: ApiRequestConfig = {},
): Promise<T> {
  const {
    retries = 3,
    retryDelay = 1000,
    showErrorToast = true,
    ...fetchConfig
  } = config;

  const API_URL =
    process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001/api";
  const fullUrl = url.startsWith("http") ? url : `${API_URL}${url}`;

  // Add auth token if available
  const token = getAuthToken();
  const headers = new Headers(fetchConfig.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && fetchConfig.method !== "GET") {
    headers.set("Content-Type", "application/json");
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(fullUrl, {
        ...fetchConfig,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Extract error code if present (from our standardized error format)
        const errorCode = errorData.error?.code as AppErrorCode | undefined;
        const errorMessage =
          errorData.error?.message ||
          errorData.message ||
          `Request failed with status ${response.status}`;

        throw new ApiError(errorMessage, response.status, errorCode, errorData);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      lastError = error as Error;

      if (error instanceof ApiError && error.status && error.status < 500) {
        break;
      }

      if (attempt < retries) {
        await sleep(retryDelay * (attempt + 1));
        continue;
      }
    }
  }

  // All retries failed
  const errorMessage =
    lastError instanceof ApiError
      ? lastError.getUserMessage()
      : lastError?.message || "An unexpected error occurred";

  if (showErrorToast) {
    toast.error(errorMessage);
  }

  throw lastError || new Error(errorMessage);
}

/**
 * Fetch with Zod schema validation
 *
 * @param url - API endpoint
 * @param schema - Zod schema to validate response
 * @param config - Request config
 * @returns Validated and typed response
 *
 * @example
 * const patient = await apiFetchWithSchema(
 *   '/patients/123',
 *   patientSchema
 * );
 */
export async function apiFetchWithSchema<T>(
  url: string,
  schema: z.ZodType<T>,
  config?: ApiRequestConfig,
): Promise<T> {
  const data = await apiFetch(url, config);
  const result = schema.safeParse(data);

  if (!result.success) {
    console.error("API response validation failed:", result.error.format());
    // In development, throw for awareness; in production, return raw data
    if (process.env["NODE_ENV"] === "development") {
      throw new Error(`Response validation failed: ${result.error.message}`);
    }
    return data as T;
  }

  return result.data;
}

/**
 * Safe parse wrapper for unknown server responses
 */
export function safeParse<T>(
  schema: z.ZodType<T>,
  data: unknown,
): T | undefined {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.warn("Parse failed:", result.error.format());
    return undefined;
  }
  return result.data;
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: <T = unknown>(url: string, config?: ApiRequestConfig) =>
    apiFetch<T>(url, { ...config, method: "GET" }),

  post: <T = unknown>(url: string, data?: unknown, config?: ApiRequestConfig) =>
    apiFetch<T>(url, {
      ...config,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = unknown>(url: string, data?: unknown, config?: ApiRequestConfig) =>
    apiFetch<T>(url, {
      ...config,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = unknown>(
    url: string,
    data?: unknown,
    config?: ApiRequestConfig,
  ) =>
    apiFetch<T>(url, {
      ...config,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = unknown>(url: string, config?: ApiRequestConfig) =>
    apiFetch<T>(url, { ...config, method: "DELETE" }),
};

/**
 * Typed API endpoints
 *
 * @example
 * const patients = await typedApi.patients.list({ search: 'John' });
 * const patient = await typedApi.patients.get('patient-id');
 * const newPatient = await typedApi.patients.create({ ... });
 */
export const typedApi = {
  patients: {
    list: (params?: { limit?: number; cursor?: string; search?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.cursor) searchParams.set("cursor", params.cursor);
      if (params?.search) searchParams.set("search", params.search);
      const query = searchParams.toString();
      return api.get<PaginatedResponse<unknown>>(
        `${API_ROUTES.patients.list}${query ? `?${query}` : ""}`,
      );
    },
    get: (id: string) => api.get(API_ROUTES.patients.get(id)),
    create: (data: unknown) => api.post(API_ROUTES.patients.create, data),
    update: (id: string, data: unknown) =>
      api.patch(API_ROUTES.patients.update(id), data),
    delete: (id: string) => api.delete(API_ROUTES.patients.delete(id)),
  },

  appointments: {
    list: (params?: {
      date?: string;
      startDate?: string;
      endDate?: string;
    }) => {
      const searchParams = new URLSearchParams();
      if (params?.date) searchParams.set("date", params.date);
      if (params?.startDate) searchParams.set("startDate", params.startDate);
      if (params?.endDate) searchParams.set("endDate", params.endDate);
      const query = searchParams.toString();
      return api.get(
        `${API_ROUTES.appointments.list}${query ? `?${query}` : ""}`,
      );
    },
    get: (id: string) => api.get(API_ROUTES.appointments.get(id)),
    create: (data: unknown) => api.post(API_ROUTES.appointments.create, data),
    update: (id: string, data: unknown) =>
      api.patch(API_ROUTES.appointments.update(id), data),
  },

  doctors: {
    list: () => api.get(API_ROUTES.doctors.list),
    get: (id: string) => api.get(API_ROUTES.doctors.get(id)),
    availability: (id: string, date: string) =>
      api.get(`${API_ROUTES.doctors.availability(id)}?date=${date}`),
  },

  dashboard: {
    stats: () => api.get(API_ROUTES.dashboard.stats),
  },
};

/**
 * Handle API errors consistently
 */
export function handleApiError(
  error: unknown,
  fallbackMessage = "An error occurred",
): string {
  if (error instanceof ApiError) {
    return error.getUserMessage();
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

// Re-export API_ROUTES for convenience
export { API_ROUTES };
