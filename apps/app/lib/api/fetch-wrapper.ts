export interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean>;
  token?: string;
}

export interface ApiError extends Error {
  status?: number;
  data?: unknown;
}

export async function apiFetch<T>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const { method = "GET", headers = {}, body, params, token } = options;

  const fullUrl = new URL(
    url,
    typeof window !== "undefined" ? window.location.origin : "http://localhost",
  );
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      fullUrl.searchParams.append(key, String(value));
    });
  }

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (token) {
    finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(fullUrl.toString(), {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(
      (errorData as Record<string, unknown>).message || `HTTP ${response.status}: ${response.statusText}`,
    ) as ApiError;
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  const data = await response.json();
  return data as T;
}

export function createApiClient(token?: string) {
  return {
    get: <T>(url: string, options?: Omit<FetchOptions, "method">) =>
      apiFetch<T>(url, { ...options, method: "GET", token }),

    post: <T>(
      url: string,
      body?: unknown,
      options?: Omit<FetchOptions, "method" | "body">,
    ) => apiFetch<T>(url, { ...options, method: "POST", body, token }),

    put: <T>(
      url: string,
      body?: unknown,
      options?: Omit<FetchOptions, "method" | "body">,
    ) => apiFetch<T>(url, { ...options, method: "PUT", body, token }),

    patch: <T>(
      url: string,
      body?: unknown,
      options?: Omit<FetchOptions, "method" | "body">,
    ) => apiFetch<T>(url, { ...options, method: "PATCH", body, token }),

    delete: <T>(
      url: string,
      options?: Omit<FetchOptions, "method">,
    ) => apiFetch<T>(url, { ...options, method: "DELETE", token }),
  };
}
