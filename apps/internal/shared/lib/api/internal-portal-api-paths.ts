import type { RequestConfig } from "@workspace/data-access";

/**
 * Paths the Internal Console may call with a session token. Everything else
 * is rejected in the client to avoid mixing internal tooling with clinic APIs.
 */
export function assertInternalPortalApiRequest(
  endpoint: string,
  options: Pick<RequestConfig, "skipAuth">,
): void {
  if (options.skipAuth) {
    return;
  }

  const raw = endpoint.trim().split("?")[0] ?? "";
  if (!raw) {
    return;
  }

  const path = raw.startsWith("/") ? raw : `/${raw}`;

  const allowed =
    path.startsWith("/internal/") ||
    path.startsWith("/auth/") ||
    path.startsWith("/monitoring/") ||
    path === "/monitoring" ||
    path.startsWith("/performance/") ||
    path === "/performance" ||
    path.startsWith("/operations/") ||
    path === "/operations" ||
    path === "/health" ||
    path.startsWith("/health/");

  if (!allowed) {
    throw new Error(
      `Internal portal requests must use internal, auth, monitoring, performance, operations, or health paths. Refusing: ${path}`,
    );
  }
}
