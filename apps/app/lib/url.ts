"use client";

import { API_URL } from "@/lib/api-config";
import { getAppUrl } from "@/lib/config";

function normalizePath(pathOrUrl: string): string {
  return pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
}

function resolveApiOrigin(): string {
  try {
    return new URL(API_URL).origin;
  } catch {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }

    return getAppUrl();
  }
}

export function toAbsoluteAppUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  const normalizedPath = normalizePath(pathOrUrl);

  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${normalizedPath}`;
  }

  return `${getAppUrl()}${normalizedPath}`;
}

export function toAbsoluteApiUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${resolveApiOrigin()}${normalizePath(pathOrUrl)}`;
}
