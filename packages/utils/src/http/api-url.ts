export function resolveApiUrl(value: string, origin?: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value.replace(/\/$/, "");
  }

  const runtimeOrigin =
    origin ??
    (typeof window !== "undefined" ? window.location.origin : undefined);

  if (!runtimeOrigin) return value;

  return new URL(value, runtimeOrigin).toString().replace(/\/$/, "");
}

/** Hosts that are the upstream API origin itself (Fly). The `/api/v1` same-origin
 * proxy only exists on the app origins (`app.docita.work`, `internal.docita.work`),
 * so when the browser is already on an API host the configured URL is kept as-is. */
const UPSTREAM_API_HOSTS = new Set([
  "api.docita.work",
  "staging-api.docita.work",
]);

/**
 * Decide whether the browser should use the same-origin `/api/v1` proxy instead
 * of a configured absolute upstream API URL. Shared by app-vite and
 * internal-vite so the Cloudflare same-origin cookie rule lives in one place.
 *
 * When a build accidentally inlines `VITE_API_URL` as the upstream Fly origin,
 * browser fetches become cross-origin and fail CORS + cookie auth; prefer the
 * app-origin proxy whenever the browser is not on an API host.
 */
export function shouldUseSameOriginApiProxy(
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
    return UPSTREAM_API_HOSTS.has(new URL(configured).hostname);
  } catch {
    return false;
  }
}
