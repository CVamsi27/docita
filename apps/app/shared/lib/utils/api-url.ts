"use client";

import { getAppApiUrl } from "@/lib/api/api-config";
import { getAppUrl } from "@/lib/constants/env-config";

import { isAbsoluteHttpUrl, normalizePath } from "./path-url";

function resolveApiOrigin(): string {
  try {
    return new URL(getAppApiUrl()).origin;
  } catch {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }

    return getAppUrl();
  }
}

export function toAbsoluteApiUrl(pathOrUrl: string): string {
  if (isAbsoluteHttpUrl(pathOrUrl)) {
    return pathOrUrl;
  }

  return `${resolveApiOrigin()}${normalizePath(pathOrUrl)}`;
}
