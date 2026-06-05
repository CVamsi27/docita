"use client";

export function normalizePath(pathOrUrl: string): string {
  return pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
}

export function isAbsoluteHttpUrl(pathOrUrl: string): boolean {
  return /^https?:\/\//i.test(pathOrUrl);
}
