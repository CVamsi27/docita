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
  const configuredUrl =
    import.meta.env["PUBLIC_APP_URL"] ||
    import.meta.env["NEXT_PUBLIC_APP_URL"] ||
    import.meta.env["APP_URL"];

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
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

let cachedCsrfToken: string | null = null;

async function ensureCsrfToken(): Promise<string | null> {
  if (cachedCsrfToken) {
    return cachedCsrfToken;
  }

  const existingToken = getCsrfTokenFromCookie();
  if (existingToken) {
    cachedCsrfToken = existingToken;
    return existingToken;
  }

  try {
    const response = await fetch(`${getLandingApiBaseUrl()}/public/platform-stats`, {
      credentials: "include",
    });
    const headerToken = response.headers.get("X-CSRF-Token");
    if (headerToken) {
      cachedCsrfToken = headerToken;
      return headerToken;
    }
  } catch {
    return null;
  }

  const cookieToken = getCsrfTokenFromCookie();
  cachedCsrfToken = cookieToken;
  return cookieToken;
}

interface ContactInquiryPayload {
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
