import {
  type APIError,
  getAPIClient,
  type RequestConfig,
} from "@workspace/data-access";
import { isRecord } from "@workspace/utils";
import { API_URL } from "./api-config";
import { assertInternalPortalApiRequest } from "./internal-portal-api-paths";
import { internalSession } from "@/lib/auth/session";

let authLogoutCallback: ((reason: string) => void) | null = null;

export function setAuthLogoutCallback(
  callback: ((reason: string) => void) | null,
) {
  authLogoutCallback = callback;
}

export const client = getAPIClient({
  baseURL: API_URL,
  getToken: () => internalSession.getToken(),
  validateRequest: (endpoint, options) => {
    assertInternalPortalApiRequest(endpoint, options);
  },
  onFetchResponse: (response) => {
    internalSession.captureCsrfFromResponse(response);
  },
  onRequest: (config: RequestConfig): RequestConfig => {
    const mutating = ["POST", "PUT", "PATCH", "DELETE"];
    if (mutating.includes((config.method ?? "GET").toUpperCase())) {
      const csrfToken = internalSession.getCsrfToken();
      if (csrfToken) {
        config.headers = { ...config.headers, "x-xsrf-token": csrfToken };
      }
    }
    return config;
  },
  onError: async (error: APIError) => {
    if (error.status === 401) {
      if (internalSession.getToken()) {
        const refreshed = await internalSession.refreshAccessToken();
        if (refreshed) {
          return;
        }
      }
    }

    if (error.status === 401) {
      internalSession.clearSession();
      authLogoutCallback?.("Your session has expired. Please log in again.");
    }

    if (error.status === 404) {
      const message =
        isRecord(error.data) && typeof error.data.message === "string"
          ? error.data.message
          : undefined;
      if (message) {
        error.data = { ...(error.data as Record<string, unknown>), message };
      }
    }
  },
});

/**
 * Thin wrappers retained for the transitional feature shells. New internal
 * feature code should use `client` (or `@workspace/data-access` hooks).
 */
function normalizeInternalPath(path: string): string {
  if (path.startsWith("/api/v1/")) {
    return path.slice("/api/v1".length);
  }
  if (path.startsWith("/api/internal/")) {
    return path.slice("/api".length);
  }
  return path;
}

export async function apiGet<T>(path: string): Promise<T> {
  return client.get<T>(normalizeInternalPath(path));
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return client.post<T>(normalizeInternalPath(path), body);
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return client.patch<T>(normalizeInternalPath(path), body);
}
