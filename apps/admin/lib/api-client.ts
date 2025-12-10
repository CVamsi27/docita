import { API_URL } from "./api";

let authLogoutCallback: ((reason: string) => void) | null = null;

/**
 * Set the logout callback to be called when auth errors occur
 */
export function setAuthLogoutCallback(callback: (reason: string) => void) {
  authLogoutCallback = callback;
}

/**
 * Enhanced fetch wrapper that handles auth errors and token validation
 */
export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit & { skipAuthCheck?: boolean } = {},
) {
  const { skipAuthCheck = false, ...fetchOptions } = options;

  const token = localStorage.getItem("docita_admin_token");

  // Set up headers
  const headers = new Headers(fetchOptions.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  // Handle auth errors
  if (!skipAuthCheck) {
    if (response.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("docita_admin_token");
      localStorage.removeItem("docita_admin_user");
      authLogoutCallback?.("Your session has expired. Please log in again.");
      return response;
    }

    if (response.status === 404) {
      // Check if it's a user not found error (account deleted)
      try {
        const data = await response.clone().json();
        if (
          data.message?.toLowerCase().includes("user") ||
          data.message?.toLowerCase().includes("not found")
        ) {
          localStorage.removeItem("docita_admin_token");
          localStorage.removeItem("docita_admin_user");
          authLogoutCallback?.(
            "Your account has been deleted. Please contact support.",
          );
          return response;
        }
      } catch {
        // Not a JSON response, continue normally
      }
    }

    if (response.status === 403) {
      // Permission denied / role changed
      localStorage.removeItem("docita_admin_token");
      localStorage.removeItem("docita_admin_user");
      authLogoutCallback?.(
        "You no longer have access to this resource. Please log in again.",
      );
      return response;
    }
  }

  return response;
}
