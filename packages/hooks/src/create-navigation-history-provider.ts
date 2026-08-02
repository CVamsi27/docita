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
 * app's own pathname hook. `apps/app-vite` and `apps/internal-vite` each have
 * a `NavigationHistoryProvider` that is identical apart from its storage-key
 * prefix and which pathname hook it calls (`useLocation().pathname` in the
 * Vite apps, via a small adapter); accepting the hook as a parameter keeps
 * this package decoupled from `react-router` while still letting the provider
 * component's shape live in exactly one place.
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
