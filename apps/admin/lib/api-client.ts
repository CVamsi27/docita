import { getAPIClient } from "@workspace/data-access";

let authLogoutCallback: ((reason: string) => void) | null = null;

export function setAuthLogoutCallback(callback: (reason: string) => void) {
  authLogoutCallback = callback;
}

/**
 * Admin portal API client
 */
export const client = getAPIClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1",
  getToken: () => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("docita_admin_token");
  },
  onError: async (error) => {
    if (error.status === 401 || error.status === 403) {
      localStorage.removeItem("docita_admin_token");
      localStorage.removeItem("docita_admin_user");

      const reason =
        error.status === 401
          ? "Your session has expired. Please log in again."
          : "You no longer have access to this resource. Please log in again.";

      authLogoutCallback?.(reason);
    }

    // Check for 404 account deletion case (from original admin client)
    if (error.status === 404) {
      const data = error.data as { message?: string };
      if (
        data?.message?.toLowerCase().includes("user") ||
        data?.message?.toLowerCase().includes("not found")
      ) {
        localStorage.removeItem("docita_admin_token");
        localStorage.removeItem("docita_admin_user");
        authLogoutCallback?.(
          "Your account has been deleted. Please contact support.",
        );
      }
    }
  },
});

/**
 * Legacy support for fetchWithAuth
 */
export const fetchWithAuth = async (
  endpoint: string,
  options: RequestInit & { skipAuth?: boolean } = {},
) => {
  const { ...rest } = options;
  return client.request(endpoint, { ...rest, skipAuth: options.skipAuth });
};
