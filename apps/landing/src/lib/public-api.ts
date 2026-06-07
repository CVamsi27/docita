function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, "");
  if (/\/api$/i.test(trimmed)) {
    return `${trimmed}/v1`;
  }
  return trimmed;
}

function getBaseOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;

  return import.meta.env["PUBLIC_SITE_URL"] || "http://127.0.0.1:3003";
}

function getLandingApiBaseUrl(): string {
  const baseUrl = import.meta.env["PUBLIC_API_URL"] || "/api/v1";
  return normalizeBaseUrl(baseUrl);
}

export function resolveApiUrl(path: string, baseOrigin = getBaseOrigin()): string {
  const baseUrl = getLandingApiBaseUrl();
  if (baseUrl.startsWith("/")) {
    return new URL(`${baseUrl}${path}`, baseOrigin).toString();
  }

  return `${baseUrl}${path}`;
}

export function getAppBaseUrl(): string {
  const configuredUrl =
    import.meta.env["PUBLIC_APP_URL"] ||
    import.meta.env["NEXT_PUBLIC_APP_URL"] ||
    import.meta.env["APP_URL"];

  if (configuredUrl) return configuredUrl.replace(/\/+$/, "");

  return "http://localhost:3000";
}

export { fetchLandingJson, resolvePaymentRedirectLocation } from "./api-fetch";
