import { getAppApiUrl } from "@/lib/api/api-config";
import { getAppUrl } from "@/lib/api/api-config-values";

function isAbsoluteHttpUrl(pathOrUrl: string): boolean {
  return /^https?:\/\//i.test(pathOrUrl);
}

function normalizePath(pathOrUrl: string): string {
  return pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
}

function resolveApiOrigin(): string {
  const apiUrl = getAppApiUrl();
  try {
    return new URL(apiUrl).origin;
  } catch {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
    return getAppUrl();
  }
}

/** Resolve a stored API-relative path (e.g. `/uploads/…`) to a full URL the browser can load. */
export function toAbsoluteApiUrl(pathOrUrl: string): string {
  if (isAbsoluteHttpUrl(pathOrUrl)) {
    return pathOrUrl;
  }
  return `${resolveApiOrigin()}${normalizePath(pathOrUrl)}`;
}
