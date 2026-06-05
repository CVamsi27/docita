"use client";

import { getAppUrl } from "@/lib/constants/env-config";

import { isAbsoluteHttpUrl, normalizePath } from "./path-url";

export function toAbsoluteAppUrl(pathOrUrl: string): string {
  if (isAbsoluteHttpUrl(pathOrUrl)) {
    return pathOrUrl;
  }

  const normalizedPath = normalizePath(pathOrUrl);

  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${normalizedPath}`;
  }

  return `${getAppUrl()}${normalizedPath}`;
}
