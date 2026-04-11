import { API_URL } from "@/lib/api-config";
import { appSession } from "@/lib/session";

function isMutatingMethod(method: string | undefined): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes((method ?? "GET").toUpperCase());
}

function mergeHeaders(
  headers: HeadersInit | undefined,
  token: string | null,
  csrfToken: string | null,
  method: string | undefined,
): Headers {
  const merged = new Headers(headers ?? {});
  if (token) {
    merged.set("Authorization", `Bearer ${token}`);
  }

  if (isMutatingMethod(method) && csrfToken && !merged.has("x-xsrf-token")) {
    merged.set("x-xsrf-token", csrfToken);
  }

  return merged;
}

export async function fetchWithSession(
  endpoint: string,
  init?: RequestInit,
): Promise<Response> {
  const csrfToken = appSession.getCsrfToken();
  const request = (token: string | null) =>
    fetch(`${API_URL}${endpoint}`, {
      ...init,
      credentials: "include",
      headers: mergeHeaders(init?.headers, token, csrfToken, init?.method),
    });

  let response = await request(appSession.getToken());
  if (response.status === 401) {
    const refreshed = await appSession.refreshAccessToken();
    if (refreshed) {
      response = await request(appSession.getToken());
    }
  }

  if (response.status === 401) {
    appSession.clearSession();
    appSession.redirectToLogin();
  }

  return response;
}

export async function fetchJsonWithSession<T>(
  endpoint: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetchWithSession(endpoint, init);
  if (!response.ok) {
    throw new Error("We could not load the requested details. Please try again.");
  }

  return response.json() as Promise<T>;
}
