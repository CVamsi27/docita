/**
 * Fetch Wrapper
 * Centralized HTTP client with error handling, auth, etc.
 */

import { API_ENDPOINTS } from "./endpoints";

export interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean>;
  token?: string;
}

/**
 * Fetch wrapper with error handling and auth
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const { method = "GET", headers = {}, body, params, token } = options;

  // Add query parameters
  const fullUrl = new URL(
    url,
    typeof window !== "undefined" ? window.location.origin : "http://localhost",
  );
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      fullUrl.searchParams.append(key, String(value));
    });
  }

  // Prepare headers
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  // Add authorization token
  if (token) {
    finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(fullUrl.toString(), {
      method,
      headers: finalHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    // Handle errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
      );
      (error as any).status = response.status;
      (error as any).data = errorData;
      throw error;
    }

    // Parse response
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API Error (${method} ${url}):`, error);
    throw error;
  }
}

/**
 * Create API client instance
 */
export function createApiClient(token?: string) {
  return {
    get: <T = unknown>(url: string, options?: Omit<FetchOptions, "method">) =>
      apiFetch<T>(url, { ...options, method: "GET", token }),

    post: <T = unknown>(
      url: string,
      body?: unknown,
      options?: Omit<FetchOptions, "method" | "body">,
    ) => apiFetch<T>(url, { ...options, method: "POST", body, token }),

    put: <T = unknown>(
      url: string,
      body?: unknown,
      options?: Omit<FetchOptions, "method" | "body">,
    ) => apiFetch<T>(url, { ...options, method: "PUT", body, token }),

    patch: <T = unknown>(
      url: string,
      body?: unknown,
      options?: Omit<FetchOptions, "method" | "body">,
    ) => apiFetch<T>(url, { ...options, method: "PATCH", body, token }),

    delete: <T = unknown>(
      url: string,
      options?: Omit<FetchOptions, "method">,
    ) => apiFetch<T>(url, { ...options, method: "DELETE", token }),
  };
}
