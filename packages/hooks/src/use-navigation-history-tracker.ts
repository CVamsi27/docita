"use client";

import { useEffect, useRef } from "react";

export interface NavigationHistoryStorageKeys {
  /** sessionStorage key tracking the running in-app navigation count. */
  countKey: string;
  /** sessionStorage key recording the path the session entered on. */
  entryKey: string;
}

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readNavCount(countKey: string): number {
  const storage = getSessionStorage();
  if (!storage) return 0;
  const raw = storage.getItem(countKey);
  const value = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(value) ? value : 0;
}

/**
 * Builds a pair of pathname-driven helpers for tracking in-app navigation
 * history via `sessionStorage`. Each app provides its own storage key prefix
 * (so `docita` and `docita-internal` sessions don't collide) and supplies the
 * current pathname from its own router (`usePathname()` from
 * `next/navigation`) — keeping this helper framework-agnostic.
 */
export function createNavigationHistoryTracker({
  countKey,
  entryKey,
}: NavigationHistoryStorageKeys) {
  function readInAppNavCount(): number {
    return readNavCount(countKey);
  }

  function useNavigationHistoryEffect(pathname: string | null) {
    const lastPathRef = useRef<string | null>(null);

    useEffect(() => {
      const storage = getSessionStorage();
      if (!storage || !pathname) return;

      if (lastPathRef.current === pathname) return;
      lastPathRef.current = pathname;

      const current = readNavCount(countKey);
      if (current === 0) {
        storage.setItem(entryKey, pathname);
      }
      storage.setItem(countKey, String(current + 1));
    }, [pathname]);
  }

  return { readInAppNavCount, useNavigationHistoryEffect };
}
