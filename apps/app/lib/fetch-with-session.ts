import { API_URL } from "@/lib/api-config";
import { appSession } from "@/lib/session";

function mergeHeaders(
  headers: HeadersInit | undefined,
  token: string | null,
): Headers {
  const merged = new Headers(headers ?? {});
  if (token) {
    merged.set("Authorization", `Bearer ${token}`);
  }
  return merged;
}

export async function fetchWithSession(
  endpoint: string,
  init?: RequestInit,
): Promise<Response> {
  const request = (token: string | null) =>
    fetch(`${API_URL}${endpoint}`, {
      ...init,
      credentials: "include",
      headers: mergeHeaders(init?.headers, token),
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
    let message = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { message?: string };
      if (typeof payload?.message === "string" && payload.message.length > 0) {
        message = payload.message;
      }
    } catch {}
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}
