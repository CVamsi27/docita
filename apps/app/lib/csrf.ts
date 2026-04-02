"use client";

export function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;

  const token = document.cookie
    .split("; ")
    .find((row) => row.startsWith("XSRF-TOKEN="))
    ?.split("=")[1];

  return token ? decodeURIComponent(token) : null;
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
