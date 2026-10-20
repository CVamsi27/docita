import { useMemo, useSyncExternalStore } from "react";
import {
  createApiAvailabilityStore,
  createReadinessProber,
  type ApiAvailabilitySnapshot,
  type ApiAvailabilityStore,
} from "../lib/api-availability";

export type {
  ApiAvailabilitySnapshot,
  ApiAvailabilityStore,
} from "../lib/api-availability";

interface ApiAvailability extends ApiAvailabilitySnapshot {
  /** Skip the current backoff delay and probe the API again immediately. */
  retryNow: () => void;
}

/**
 * Subscribe to an app's shared API/platform availability state.
 *
 * Each app creates one module-level store with its own API base (see
 * `apps/<app>/src/lib/api/api-availability.ts`) and passes its accessors here,
 * so the clinician app and the internal console share the behavior without
 * sharing outage state across deployments.
 */
export function createUseApiAvailability(store: ApiAvailabilityStore) {
  return function useApiAvailability(): ApiAvailability {
    const snapshot = useSyncExternalStore(
      store.subscribe,
      store.getSnapshot,
      store.getSnapshot,
    );

    return useMemo(
      () => ({ ...snapshot, retryNow: store.retryNow }),
      [snapshot, store.retryNow],
    );
  };
}

/**
 * Convenience for bootstrapping an app's module-level store + hook pair. The
 * returned object carries the store itself, every store method (so a binding
 * module can `export const { trackApiResponse, ... } = apiAvailability`), and
 * the bound `useApiAvailability` hook.
 */
export function createApiAvailability(getApiBaseUrl: () => string): {
  store: ApiAvailabilityStore;
  getSnapshot: ApiAvailabilityStore["getSnapshot"];
  trackResponse: ApiAvailabilityStore["trackResponse"];
  reportUnavailable: ApiAvailabilityStore["reportUnavailable"];
  confirmUnavailability: ApiAvailabilityStore["confirmUnavailability"];
  waitForAvailable: ApiAvailabilityStore["waitForAvailable"];
  retryNow: ApiAvailabilityStore["retryNow"];
  useApiAvailability: () => ApiAvailability;
} {
  const store = createApiAvailabilityStore(createReadinessProber(getApiBaseUrl));
  return {
    store,
    getSnapshot: store.getSnapshot,
    trackResponse: store.trackResponse,
    reportUnavailable: store.reportUnavailable,
    confirmUnavailability: store.confirmUnavailability,
    waitForAvailable: store.waitForAvailable,
    retryNow: store.retryNow,
    useApiAvailability: createUseApiAvailability(store),
  };
}

function subscribeOnline(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getBrowserOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

/**
 * Browser connectivity, so outage copy can distinguish "your device is
 * offline" from "the server is coming back" instead of blaming the server.
 * Shared replacement for the per-app `useNetworkStatus` hooks.
 */
export function useNetworkStatus(): boolean {
  return useSyncExternalStore(subscribeOnline, getBrowserOnline, () => true);
}
