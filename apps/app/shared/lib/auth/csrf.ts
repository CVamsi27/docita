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
    ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
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
