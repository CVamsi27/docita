import { resolveApiUrl } from "@workspace/utils";

const DEFAULT_API_URL = "/api/v1";

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
export const resolveAppApiUrl = resolveApiUrl;

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
