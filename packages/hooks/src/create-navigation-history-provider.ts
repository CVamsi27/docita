"use client";

import type { ReactNode } from "react";
import {
  createNavigationHistoryTracker,
  type NavigationHistoryStorageKeys,
} from "./use-navigation-history-tracker.js";

export interface NavigationHistoryProviderFactoryResult {
  /** Reads the running in-app navigation count for the current session. */
  readInAppNavCount: () => number;
  /** Wraps `children`, tracking each pathname change as it mounts. */
  NavigationHistoryProvider: (props: { children: ReactNode }) => ReactNode;
}

/**
 * Builds a complete navigation-history provider — component and
 * `readInAppNavCount` reader together — from a storage-key pair and the host
 * app's own `usePathname` hook. `apps/app` and `apps/internal` each had a
 * `NavigationHistoryProvider` that was identical apart from its storage-key
 * prefix and which `usePathname` it called; accepting the hook as a parameter
 * keeps this package decoupled from `next/navigation` while still letting the
 * provider component's shape live in exactly one place.
 */
export function createNavigationHistoryProvider(
  keys: NavigationHistoryStorageKeys,
  usePathname: () => string | null,
): NavigationHistoryProviderFactoryResult {
  const { readInAppNavCount, useNavigationHistoryEffect } =
    createNavigationHistoryTracker(keys);

  function NavigationHistoryProviderComponent({
    children,
  }: {
    children: ReactNode;
  }) {
    const pathname = usePathname();
    useNavigationHistoryEffect(pathname);

    return children;
  }

  return {
    readInAppNavCount,
    NavigationHistoryProvider: NavigationHistoryProviderComponent,
  };
}
