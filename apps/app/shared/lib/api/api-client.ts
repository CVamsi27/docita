import { getAppApiUrl } from "./api-config";
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
import { appSession } from "@/lib/auth/session";
import { handleApiClientError } from "./api-client-error-handler";
import { trackApiResponse } from "./api-availability";

function resolveClientBaseUrl(): string {
  const url = getAppApiUrl();
  return url.endsWith("/") ? url : `${url}/`;
}

let cachedClient: APIClient | null = null;
let cachedBaseUrl: string | null = null;

function getAppApiClient(): APIClient {
  const baseURL = resolveClientBaseUrl();
  if (cachedClient && cachedBaseUrl === baseURL) {
    return cachedClient;
  }

  cachedBaseUrl = baseURL;
  cachedClient = getAPIClient({
    baseURL,
    getToken: () => appSession.getToken(),
    timeout: 30000,
    retries: 3,
    onFetchResponse: (response) => {
      appSession.captureCsrfFromResponse(response);
      trackApiResponse(response);
    },
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
  return cachedClient;
}

type AppApiClient = Pick<
  APIClient,
  "get" | "post" | "put" | "patch" | "delete" | "validate"
>;

function withAppClient<T>(run: (client: APIClient) => Promise<T>): Promise<T> {
  return run(getAppApiClient());
}

export const api: AppApiClient = {
  get: (endpoint, options) =>
    withAppClient((client) => client.get(endpoint, options)),
  post: (endpoint, body, options) =>
    withAppClient((client) => client.post(endpoint, body, options)),
  put: (endpoint, body, options) =>
    withAppClient((client) => client.put(endpoint, body, options)),
  patch: (endpoint, body, options) =>
    withAppClient((client) => client.patch(endpoint, body, options)),
  delete: (endpoint, options) =>
    withAppClient((client) => client.delete(endpoint, options)),
  validate: (endpoint, schema, options) =>
    withAppClient((client) => client.validate(endpoint, schema, options)),
};

export const apiFetch: APIClient["request"] = (endpoint, options) =>
  withAppClient((client) => client.request(endpoint, options));

export const typedApi = {
  patients: {
    list: (params?: { limit?: number; page?: number; search?: string }) =>
      withAppClient((client) =>
        client.validate(
          API_ROUTES.patients.list,
          listPatientsResponseSchema,
          params
            ? { params: listPatientsQuerySchema.parse(params) }
            : undefined,
        ),
      ),
    get: (id: string) =>
      withAppClient((client) =>
        client.validate(API_ROUTES.patients.get(id), patientResponseSchema),
      ),
    create: (data: Record<string, unknown>) =>
      withAppClient((client) => client.post(API_ROUTES.patients.create, data)),
    update: (id: string, data: unknown) =>
      withAppClient((client) =>
        client.patch(API_ROUTES.patients.update(id), data),
      ),
    delete: (id: string) =>
      withAppClient((client) => client.delete(API_ROUTES.patients.delete(id))),
  },

  appointments: {
    list: (params?: { date?: string; startDate?: string; endDate?: string }) =>
      withAppClient((client) =>
        client.get(API_ROUTES.appointments.list, { params }),
      ),
    get: (id: string) =>
      withAppClient((client) => client.get(API_ROUTES.appointments.get(id))),
    create: (data: Record<string, unknown>) =>
      withAppClient((client) =>
        client.post(API_ROUTES.appointments.create, data),
      ),
    update: (id: string, data: unknown) =>
      withAppClient((client) =>
        client.patch(API_ROUTES.appointments.update(id), data),
      ),
  },

  doctors: {
    list: () => withAppClient((client) => client.get(API_ROUTES.doctors.list)),
    get: (id: string) =>
      withAppClient((client) => client.get(API_ROUTES.doctors.get(id))),
    availability: (id: string, date: string) =>
      withAppClient((client) =>
        client.get(API_ROUTES.doctors.availability(id), { params: { date } }),
      ),
  },

  clinics: {
    searchForJoin: (query: string) =>
      withAppClient((client) =>
        client.get<
          Array<{
            id: string;
            name: string;
            address?: string;
            specialization?: string;
          }>
        >(API_ROUTES.clinics.searchForJoin, { params: { query } }),
      ),
  },

  joinRequests: {
    create: (data: {
      clinicId: string;
      requestedRole: string;
      message?: string;
    }) =>
      withAppClient((client) =>
        client.post(API_ROUTES.clinics.joinRequests.create, data),
      ),
    list: (status?: string) =>
      withAppClient((client) =>
        client.get<
          Array<{
            id: string;
            status: string;
            requestedRole: string;
            message?: string;
            requestedAt: string;
            expiresAt?: string;
            clinicId: string;
            userId: string;
            clinic?: { id: string; name: string };
            user?: { id: string; name: string; email: string };
            assignedRole?: string;
            rejectionReason?: string;
            reviewedAt?: string;
          }>
        >(API_ROUTES.clinics.joinRequests.list, { params: { status } }),
      ),
    getMine: () =>
      withAppClient((client) =>
        client.get<{
          id: string;
          status: string;
          requestedRole: string;
          message?: string;
          requestedAt: string;
          expiresAt?: string;
          clinic: { id: string; name: string };
        } | null>(API_ROUTES.clinics.joinRequests.mine),
      ),
    count: () =>
      withAppClient((client) =>
        client.get<number>(API_ROUTES.clinics.joinRequests.count),
      ),
    approve: (
      id: string,
      data?: { assignedRole?: string; welcomeMessage?: string },
    ) =>
      withAppClient((client) =>
        client.post(API_ROUTES.clinics.joinRequests.approve(id), data),
      ),
    reject: (id: string, data: { reason: string }) =>
      withAppClient((client) =>
        client.post(API_ROUTES.clinics.joinRequests.reject(id), data),
      ),
    withdraw: (id: string) =>
      withAppClient((client) =>
        client.post(API_ROUTES.clinics.joinRequests.withdraw(id)),
      ),
  },

  onboarding: {
    choosePath: (path: "CREATE_CLINIC" | "JOIN_CLINIC") =>
      withAppClient((client) =>
        client.post(API_ROUTES.onboarding.choosePath, { path }),
      ),
  },

  dashboard: {
    stats: () =>
      withAppClient((client) => client.get(API_ROUTES.dashboard.stats)),
  },
};
