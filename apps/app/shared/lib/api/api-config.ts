const DEFAULT_API_URL =
  process.env["DOCITA_CLOUDFLARE"] === "1"
    ? "/api/v1"
    : "http://127.0.0.1:3001/api/v1";

const UPSTREAM_API_HOSTS = new Set([
  "api.docita.work",
  "staging-api.docita.work",
]);

/**
 * Resolve the browser-facing API base URL.
 *
 * Cloudflare production must use the same-origin `/api/v1` proxy so httpOnly
 * auth cookies (set on app.docita.work) ride on every fetch. Pointing the
 * client at https://api.docita.work breaks refresh and protected routes.
 */
export function resolveAppApiUrl(value: string, origin?: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value.replace(/\/$/, "");
  }

  const runtimeOrigin =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : undefined);

  if (!runtimeOrigin) {
    return value;
  }

  return new URL(value, runtimeOrigin).toString().replace(/\/$/, "");
}

/**
 * When a Cloudflare build accidentally inlines NEXT_PUBLIC_API_URL as the
 * upstream Fly origin, browser fetches become cross-origin and fail CORS +
 * cookie auth. Prefer the app-origin proxy whenever we are not on the API host.
 */
export function shouldUseSameOriginAppProxy(
  configured: string,
  hostname: string,
): boolean {
  if (UPSTREAM_API_HOSTS.has(hostname)) {
    return false;
  }

  if (configured.startsWith("/")) {
    return false;
  }

  try {
    const configuredHost = new URL(configured).hostname;
    return UPSTREAM_API_HOSTS.has(configuredHost);
  } catch {
    return false;
  }
}

function resolvePublishedAppApiUrl(): string {
  const configured = process.env["NEXT_PUBLIC_API_URL"] || DEFAULT_API_URL;

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;

    if (shouldUseSameOriginAppProxy(configured, hostname)) {
      return resolveAppApiUrl("/api/v1", origin);
    }
  }

  return resolveAppApiUrl(configured);
}

/** Resolve the browser-facing API base at call time (safe for client bundles). */
export function getAppApiUrl(): string {
  return resolvePublishedAppApiUrl();
}

export const API_URL = getAppApiUrl();
