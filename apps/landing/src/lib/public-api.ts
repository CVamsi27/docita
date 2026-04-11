function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, "");
  if (/\/api$/i.test(trimmed)) {
    return `${trimmed}/v1`;
  }
  return trimmed;
}

function getBaseOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  return import.meta.env["PUBLIC_SITE_URL"] || "http://127.0.0.1:3003";
}

function resolveApiUrl(path: string, baseOrigin = getBaseOrigin()): string {
  const baseUrl = getLandingApiBaseUrl();
  if (baseUrl.startsWith("/")) {
    return new URL(`${baseUrl}${path}`, baseOrigin).toString();
  }

  return `${baseUrl}${path}`;
}

export function getLandingApiBaseUrl(): string {
  const baseUrl = import.meta.env["PUBLIC_API_URL"] || "/api/v1";
  return normalizeBaseUrl(baseUrl);
}

export function getAppBaseUrl(): string {
  return import.meta.env["PUBLIC_APP_URL"] || "https://app.docita.work";
}

function getCsrfTokenFromCookie(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const tokenRow = document.cookie
    .split(";")
    .map((row) => row.trim())
    .find((row) => row.startsWith("XSRF-TOKEN="));

  if (!tokenRow) {
    return null;
  }

  return decodeURIComponent(tokenRow.slice("XSRF-TOKEN=".length));
}

async function ensureCsrfToken(): Promise<string | null> {
  const existingToken = getCsrfTokenFromCookie();
  if (existingToken) {
    return existingToken;
  }

  try {
    await fetch(`${getLandingApiBaseUrl()}/public/platform-stats`, {
      credentials: "include",
    });
  } catch {
    return null;
  }

  return getCsrfTokenFromCookie();
}

export interface ContactInquiryPayload {
  name: string;
  email: string;
  clinic: string;
  message: string;
}

export async function fetchLandingJson<T>(
  path: string,
  baseOrigin?: string,
): Promise<T> {
  const response = await fetch(resolveApiUrl(path, baseOrigin));

  if (!response.ok) {
    throw new Error("We could not load this section. Please refresh and try again.");
  }

  return (await response.json()) as T;
}

export async function submitContactInquiry(
  payload: ContactInquiryPayload,
): Promise<void> {
  const csrfToken = await ensureCsrfToken();
  const response = await fetch(`${getLandingApiBaseUrl()}/contact/inquiry`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("We could not send your message. Please try again.");
  }
}
