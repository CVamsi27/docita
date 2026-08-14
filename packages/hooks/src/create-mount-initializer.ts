"use client";

import { type ComponentType, useEffect } from "react";

/**
 * Builds a render-nothing component that fires `initialize` exactly once on
 * mount. The Next.js apps (`apps/app`, `apps/internal`) each had a
 * `SentryInitializer` that was byte-identical apart from which app-local
 * `initializeSentryClient` it wired up — this factory captures that "run a
 * side effect on mount, render nothing" shape once. The Vite apps
 * (`apps/app`, `apps/internal`) call `initializeSentryClient()`
 * directly from `main.tsx` instead of via a mount component, so this factory
 * is currently unused by both trees (knip-debt note).
 */
export function createMountInitializer(initialize: () => void): ComponentType {
  return function MountInitializer() {
    useEffect(() => {
      initialize();
    }, []);

    return null;
  };
}
