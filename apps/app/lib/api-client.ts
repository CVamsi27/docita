import { API_URL } from "./api-config";
import {
  getAPIClient,
  type APIClient,
  type APIError,
  type RequestConfig,
} from "@workspace/data-access";
import {
  API_ROUTES,
  listPatientsQuerySchema,
  listPatientsResponseSchema,
  patientResponseSchema,
} from "@workspace/types";
import { appSession } from "./session";
import { handleApiClientError } from "./api-client-error-handler";

const client = getAPIClient({
  baseURL: API_URL.endsWith("/") ? API_URL : `${API_URL}/`,
  getToken: () => appSession.getToken(),
  timeout: 30000,
  retries: 3,
  onRequest: (config: RequestConfig): RequestConfig => {
    const mutating = ["POST", "PUT", "PATCH", "DELETE"];
    if (mutating.includes((config.method ?? "GET").toUpperCase())) {
      const csrfToken = appSession.getCsrfToken();
      if (csrfToken) {
        config.headers = { ...config.headers, "x-xsrf-token": csrfToken };
      }
    }
    return config;
  },
  onError: (error: APIError) => handleApiClientError(error),
});

type AppApiClient = Pick<
  APIClient,
  "get" | "post" | "put" | "patch" | "delete" | "validate"
>;

export const api: AppApiClient = {
  get: client.get,
  post: client.post,
  put: client.put,
  patch: client.patch,
  delete: client.delete,
  validate: client.validate,
};

export const apiFetch: APIClient["request"] = client.request;
export const apiFetchWithSchema = client.validate;

export const typedApi = {
  patients: {
    list: (params?: { limit?: number; page?: number; search?: string }) =>
      client.validate(
        API_ROUTES.patients.list,
        listPatientsResponseSchema,
        params ? { params: listPatientsQuerySchema.parse(params) } : undefined,
      ),
    get: (id: string) =>
      client.validate(API_ROUTES.patients.get(id), patientResponseSchema),
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
    "Please review the information on this screen and try again"
  );
};

export { API_ROUTES };
