import {
  getAPIClient,
  type APIClient,
  type APIError,
  type RequestConfig,
} from "@workspace/data-access";

import { appSession } from "@/lib/auth/session";

import { trackApiResponse } from "./api-availability";
import { getAppApiUrl } from "./api-config";
import { handleApiClientError } from "./api-client-error-handler";

function resolveClientBaseUrl(): string {
  const url = getAppApiUrl();
  return url.endsWith("/") ? url : `${url}/`;
}

let cachedClient: APIClient | null = null;
let cachedBaseUrl: string | null = null;

function getAppApiClient(): APIClient {
  const baseURL = resolveClientBaseUrl();
  if (cachedClient && cachedBaseUrl === baseURL) return cachedClient;

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

export function withAppClient<T>(run: (client: APIClient) => Promise<T>): Promise<T> {
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
