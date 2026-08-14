import {
  resolveApiUrl,
  shouldUseSameOriginApiProxy,
} from "@workspace/utils";

const DEFAULT_API_URL = "/api/v1";

/**
 * Resolve the browser-facing API base URL.
 *
 * Cloudflare production must use the same-origin `/api/v1` proxy so httpOnly
 * auth cookies (set on app.docita.work) ride on every fetch. Pointing the
 * client at https://api.docita.work breaks refresh and protected routes.
 */
const resolveAppApiUrl = resolveApiUrl;

function resolvePublishedAppApiUrl(): string {
  const configured = process.env["VITE_API_URL"] || DEFAULT_API_URL;

  if (typeof window !== "undefined") {
    const { hostname, origin } = window.location;

    if (shouldUseSameOriginApiProxy(configured, hostname)) {
      return resolveAppApiUrl("/api/v1", origin);
    }
  }

  return resolveAppApiUrl(configured);
}

/** Resolve the browser-facing API base at call time (safe for client bundles). */
export function getAppApiUrl(): string {
  return resolvePublishedAppApiUrl();
}

export function apiPath(path: string): string {
  const base = getAppApiUrl();
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

