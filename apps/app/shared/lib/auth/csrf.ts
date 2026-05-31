"use client";

import { appSession } from "@/lib/auth/session";

export function getCsrfToken(): string | null {
  return appSession.getCsrfToken();
}

export function buildCsrfHeaders(
  baseHeaders: Record<string, string> = {},
): Record<string, string> {
  const csrfToken = getCsrfToken();
  return {
    ...baseHeaders,
    // Lowercase to match the api client's onRequest interceptor
    // (api-client.ts), which also injects `x-xsrf-token` on mutating requests.
    // Using a different case here produces two distinct object keys that
    // `fetch` then combines into a doubled `x-xsrf-token: <tok>, <tok>` header,
    // which never matches the single-value XSRF-TOKEN cookie and fails the
    // CSRF double-submit check (surfacing as "session expired" on the first
    // mutating onboarding call, e.g. step 3 "Skip for now"). Sharing the key
    // lets the interceptor cleanly overwrite it — including with the freshly
    // re-issued token on the one-shot CSRF self-heal retry.
    ...(csrfToken ? { "x-xsrf-token": csrfToken } : {}),
  };
}

export function buildJsonHeaders(
  baseHeaders: Record<string, string> = {},
): Record<string, string> {
  return buildCsrfHeaders({
    "Content-Type": "application/json",
    ...baseHeaders,
  });
}
