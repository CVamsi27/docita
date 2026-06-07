"use client";

import { type ComponentType, useEffect } from "react";

/**
 * Builds a render-nothing component that fires `initialize` exactly once on
 * mount. `apps/app` and `apps/internal` each had a `SentryInitializer` that
 * was byte-identical apart from which app-local `initializeSentryClient` it
 * wired up — this factory captures that "run a side effect on mount, render
 * nothing" shape once so each app supplies only its own initializer function.
 */
export function createMountInitializer(initialize: () => void): ComponentType {
  return function MountInitializer() {
    useEffect(() => {
      initialize();
    }, []);

    return null;
  };
}
