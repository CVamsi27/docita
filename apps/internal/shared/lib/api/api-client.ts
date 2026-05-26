import {
  type APIError,
  getAPIClient,
  type RequestConfig,
} from "@workspace/data-access";
import { isRecord } from "@workspace/utils";
import { API_URL } from "@/lib/api/api-config";
import { assertInternalPortalApiRequest } from "@/lib/api/internal-portal-api-paths";
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
      // Only attempt token refresh when we actually have an authenticated
      // session token. This prevents login failures from triggering refresh
      // calls (which are guaranteed to fail and can contribute to rate limits).
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
      if (
        message?.toLowerCase().includes("user") ||
        message?.toLowerCase().includes("not found")
      ) {
        internalSession.clearSession();
        authLogoutCallback?.(
          "Your account has been deleted. Please contact support.",
        );
      }
    }
  },
});

