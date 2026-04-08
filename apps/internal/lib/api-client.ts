import { getAPIClient } from "@workspace/data-access";
import { API_URL } from "@/lib/api-config";
import { internalSession } from "@/lib/session";

let authLogoutCallback: ((reason: string) => void) | null = null;

export function setAuthLogoutCallback(
  callback: ((reason: string) => void) | null,
) {
  authLogoutCallback = callback;
}

export const client = getAPIClient({
  baseURL: API_URL,
  getToken: () => internalSession.getToken(),
  onRequest: (config) => {
    const mutating = ["POST", "PUT", "PATCH", "DELETE"];
    if (mutating.includes((config.method ?? "GET").toUpperCase())) {
      const csrfToken = internalSession.getCsrfToken();
      if (csrfToken) {
        config.headers = { ...config.headers, "x-xsrf-token": csrfToken };
      }
    }
    return config;
  },
  onError: async (error) => {
    if (error.status === 401) {
      const refreshed = await internalSession.refreshAccessToken();
      if (refreshed) {
        return;
      }
    }

    if (error.status === 401 || error.status === 403) {
      internalSession.clearSession();

      const reason =
        error.status === 401
          ? "Your session has expired. Please log in again."
          : "You no longer have access to this resource. Please log in again.";

      authLogoutCallback?.(reason);
    }

    if (error.status === 404) {
      const data = error.data as { message?: string };
      if (
        data?.message?.toLowerCase().includes("user") ||
        data?.message?.toLowerCase().includes("not found")
      ) {
        internalSession.clearSession();
        authLogoutCallback?.(
          "Your account has been deleted. Please contact support.",
        );
      }
    }
  },
});

export const fetchWithAuth = async (
  endpoint: string,
  options: RequestInit & { skipAuth?: boolean } = {},
) => {
  const { ...rest } = options;
  return client.request(endpoint, { ...rest, skipAuth: options.skipAuth });
};
