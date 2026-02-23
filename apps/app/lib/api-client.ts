import { toast } from "sonner";
import { API_URL } from "./api-config";
import { getAPIClient } from "@workspace/data-access";
import { API_ROUTES, AppErrorCode, ERROR_MESSAGES } from "@workspace/types";

/**
 * Initialize and get the shared API client
 */
const client = getAPIClient({
  baseURL: API_URL.endsWith("/") ? API_URL : `${API_URL}/`,
  getToken: () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("docita_token");
  },
  timeout: 30000,
  retries: 3,
  onError: (error) => {
    const errorCode = (
      (error.data as Record<string, unknown>)?.error as Record<string, unknown>
    )?.code as AppErrorCode | undefined;
    const message =
      (errorCode && ERROR_MESSAGES[errorCode]) ||
      error.message ||
      "An unexpected error occurred";

    // Show toast for non-silent errors
    toast.error(message);

    if (error.status === 401) {
      // Handle logout if needed
      if (typeof window !== "undefined") {
        localStorage.removeItem("docita_token");
        // window.location.href = "/login";
      }
    }
  },
});

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
  get: client.get,
  post: client.post,
  put: client.put,
  patch: client.patch,
  delete: client.delete,
  validate: client.validate,
};

/**
 * Legacy support for apiFetch (to avoid changing all call sites at once)
 */
export const apiFetch = client.request;
export const apiFetchWithSchema = client.validate;

/**
 * Typed API endpoints
 */
export const typedApi = {
  patients: {
    list: (params?: { limit?: number; cursor?: string; search?: string }) =>
      client.get(API_ROUTES.patients.list, { params }),
    get: (id: string) => client.get(API_ROUTES.patients.get(id)),
    create: (data: Record<string, unknown>) =>
      client.post(API_ROUTES.patients.create, data),
    update: (id: string, data: unknown) =>
      client.patch(API_ROUTES.patients.update(id), data),
    delete: (id: string) => client.delete(API_ROUTES.patients.delete(id)),
  },

  appointments: {
    list: (params?: { date?: string; startDate?: string; endDate?: string }) =>
      client.get(API_ROUTES.appointments.list, { params }),
    get: (id: string) => client.get(API_ROUTES.appointments.get(id)),
    create: (data: Record<string, unknown>) =>
      client.post(API_ROUTES.appointments.create, data),
    update: (id: string, data: unknown) =>
      client.patch(API_ROUTES.appointments.update(id), data),
  },

  doctors: {
    list: () => client.get(API_ROUTES.doctors.list),
    get: (id: string) => client.get(API_ROUTES.doctors.get(id)),
    availability: (id: string, date: string) =>
      client.get(API_ROUTES.doctors.availability(id), { params: { date } }),
  },

  dashboard: {
    stats: () => client.get(API_ROUTES.dashboard.stats),
  },
};

/**
 * Handle API errors consistently
 */
export const handleApiError = (error: unknown, fallbackMessage?: string) => {
  if (error instanceof Error) return error.message;
  return fallbackMessage || "An error occurred";
};

// Re-export API_ROUTES for convenience
export { API_ROUTES };
