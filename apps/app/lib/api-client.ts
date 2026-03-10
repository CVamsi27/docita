import { toast } from "sonner";
import { API_URL } from "./api-config";
import { getAPIClient } from "@workspace/data-access";
import { API_ROUTES, AppErrorCode, ERROR_MESSAGES } from "@workspace/types";

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return Object.fromEntries(Object.entries(value));
}

function extractErrorCode(value: unknown): AppErrorCode | undefined {
  const data = toRecord(value);
  const nestedError = toRecord(data?.error);
  const code = nestedError?.code;
  return typeof code === "string" ? (code as AppErrorCode) : undefined;
}

function shouldSuppressDevToast(message: string): boolean {
  if (process.env.NODE_ENV !== "development") {
    return false;
  }

  const lowered = message.toLowerCase();
  return (
    lowered.includes("fast refresh") ||
    lowered.includes("next dev") ||
    lowered.includes("pnpm") ||
    lowered.includes("cache bypass, force executing") ||
    lowered.includes("prisma:error") ||
    lowered.includes("invalid `this.prisma") ||
    message.includes("\n")
  );
}

const client = getAPIClient({
  baseURL: API_URL.endsWith("/") ? API_URL : `${API_URL}/`,
  getToken: () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("docita_token");
  },
  timeout: 30000,
  retries: 3,
  onError: (error) => {
    const errorCode = extractErrorCode(error.data);
    const message =
      (errorCode && ERROR_MESSAGES[errorCode]) ||
      error.message ||
      "An unexpected error occurred";

    if (!shouldSuppressDevToast(message)) {
      toast.error(message);
    }

    if (error.status === 401) {

      if (typeof window !== "undefined") {
        localStorage.removeItem("docita_token");

      }
    }
  },
});

export const api = {
  get: client.get,
  post: client.post,
  put: client.put,
  patch: client.patch,
  delete: client.delete,
  validate: client.validate,
};

export const apiFetch = client.request;
export const apiFetchWithSchema = client.validate;

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

export const handleApiError = (error: unknown, fallbackMessage?: string) => {
  if (error instanceof Error) return error.message;
  return fallbackMessage || "An error occurred";
};

export { API_ROUTES };
