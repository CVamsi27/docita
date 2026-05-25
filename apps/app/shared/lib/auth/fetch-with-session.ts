import { API_URL } from "@/lib/api/api-config";
import { appSession } from "@/lib/auth/session";
import { isRecord } from "@workspace/utils";

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

export async function fetchJsonWithSession(
  endpoint: string,
  init?: RequestInit,
): Promise<unknown> {
  const response = await fetchWithSession(endpoint, init);
  if (!response.ok) {
    let details: unknown = undefined;
    try {
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        details = await response.clone().json();
      } else {
        details = await response.clone().text();
      }
    } catch {
      details = undefined;
    }

    const rawMessage = isRecord(details) ? details.message : undefined;
    // NestJS validation errors put an array in `message`; flatten it.
    const message =
      typeof rawMessage === "string"
        ? rawMessage
        : Array.isArray(rawMessage)
          ? rawMessage.filter((m) => typeof m === "string").join(". ")
          : typeof details === "string" && details.length > 0
            ? details
            : "We could not load the requested details. Please try again.";

    throw new Error(message);
  }

  return response.json();
}
