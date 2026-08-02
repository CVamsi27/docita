import { resolveApiUrl } from "@workspace/utils";

const DEFAULT_API_URL = "/api/v1";
const DEFAULT_MAIN_APP_URL = "https://app.docita.work";

const UPSTREAM_API_HOSTS = new Set([
  "api.docita.work",
  "staging-api.docita.work",
]);

/**
 * Resolve the browser-facing API base URL for the internal console.
 *
 * Cloudflare production must use the same-origin `/api/v1` proxy so auth
 * cookies (set on internal.docita.work) ride on every fetch. Pointing the
 * client at https://api.docita.work breaks refresh and protected routes.
 */
export const resolveInternalApiUrl = resolveApiUrl;

/**
 * When a Cloudflare build accidentally inlines VITE_API_URL as the
 * upstream Fly origin, browser fetches become cross-origin and fail CORS +
 * cookie auth. Prefer the app-origin proxy whenever we are not on the API host.
 */
function shouldUseSameOriginInternalProxy(
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

function resolvePublishedInternalApiUrl(): string {
  const configured = import.meta.env.VITE_API_URL || DEFAULT_API_URL;

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;

    if (shouldUseSameOriginInternalProxy(configured, hostname)) {
      return resolveInternalApiUrl("/api/v1", origin);
    }
  }

  return resolveInternalApiUrl(configured);
}

/** Resolve the browser-facing API base at call time (safe for client bundles). */
function getInternalApiUrl(): string {
  return resolvePublishedInternalApiUrl();
}

export const API_URL = getInternalApiUrl();

/**
 * The clinician-facing app origin (not the internal console). Non-INTERNAL
 * users who try to sign in here are redirected to this app's login page.
 */
export const MAIN_APP_URL =
  import.meta.env.VITE_MAIN_APP_URL || DEFAULT_MAIN_APP_URL;
