import { API_URL } from "./api-config";
import { getAPIClient } from "@workspace/data-access";
import { API_ROUTES } from "@workspace/types";
import { appSession } from "./session";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return Object.fromEntries(Object.entries(value));
}

function extractErrorCode(value: unknown): string | undefined {
  const data = toRecord(value);
  const directCode = data?.code;
  if (typeof directCode === "string") return directCode;
  const nestedError = toRecord(data?.error);
  const code = nestedError?.code;
  return typeof code === "string" ? code : undefined;
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
  getToken: () => appSession.getToken(),
  timeout: 30000,
  retries: 3,
  onRequest: (config) => {
    const mutating = ["POST", "PUT", "PATCH", "DELETE"];
    if (mutating.includes((config.method ?? "GET").toUpperCase())) {
      const csrfToken = appSession.getCsrfToken();
      if (csrfToken) {
        config.headers = { ...config.headers, "x-xsrf-token": csrfToken };
      }
    }
    return config;
  },
  onError: async (error) => {
    if (error.status === 401) {
      if (typeof window !== "undefined") {
        const refreshed = await appSession.refreshAccessToken();
        if (refreshed) {
          return;
        }

        appSession.clearSession();
        appSession.redirectToLogin();
      }
      return;
    }

    const errorCode = extractErrorCode(error.data);
    const fallback =
      error.status && error.status >= 400 && error.status < 500
        ? "Please check the information and try again."
        : "Please review the information on this screen and try again.";

    if (!shouldSuppressDevToast(error.message || "")) {
      showUserFacingErrorToast(
        error,
        fallback,
        error.status && error.status >= 400 && error.status < 500
          ? "form"
          : "generic",
      );
    }

    if (error.status === 403 && typeof window !== "undefined") {
      const code = errorCode;
      if (code === "EMAIL_NOT_VERIFIED") {
        window.location.href = "/verify-email-sent";
        return;
      } else if (code === "SUBSCRIPTION_INACTIVE" || code === "INSUFFICIENT_TIER") {
        window.location.href = "/settings?tab=subscription";
      } else if (code === "NO_CLINIC") {
        window.location.href = "/choose-path";
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

  clinics: {
    searchForJoin: (query: string) =>
      client.get<Array<{ id: string; name: string; address?: string; specialization?: string }>>(API_ROUTES.clinics.searchForJoin, { params: { query } }),
  },

  joinRequests: {
    create: (data: { clinicId: string; requestedRole: string; message?: string }) =>
      client.post(API_ROUTES.clinics.joinRequests.create, data),
    list: (status?: string) =>
      client.get<Array<{ id: string; status: string; requestedRole: string; message?: string; requestedAt: string; expiresAt?: string; clinicId: string; userId: string; clinic?: { id: string; name: string }; user?: { id: string; name: string; email: string }; assignedRole?: string; rejectionReason?: string; reviewedAt?: string }>>(API_ROUTES.clinics.joinRequests.list, { params: { status } }),
    getMine: () => client.get<{ id: string; status: string; requestedRole: string; message?: string; requestedAt: string; expiresAt?: string; clinic: { id: string; name: string } } | null>(API_ROUTES.clinics.joinRequests.mine),
    count: () => client.get<number>(API_ROUTES.clinics.joinRequests.count),
    approve: (id: string, data?: { assignedRole?: string; welcomeMessage?: string }) =>
      client.post(API_ROUTES.clinics.joinRequests.approve(id), data),
    reject: (id: string, data: { reason: string }) =>
      client.post(API_ROUTES.clinics.joinRequests.reject(id), data),
    withdraw: (id: string) =>
      client.post(API_ROUTES.clinics.joinRequests.withdraw(id)),
  },

  onboarding: {
    choosePath: (path: 'CREATE_CLINIC' | 'JOIN_CLINIC') =>
      client.post(API_ROUTES.onboarding.choosePath, { path }),
  },

  dashboard: {
    stats: () => client.get(API_ROUTES.dashboard.stats),
  },
};

export const handleApiError = (error: unknown, fallbackMessage?: string) => {
  void error;
  return (
    fallbackMessage ||
    "Please review the information on this screen and try again."
  );
};

export { API_ROUTES };
