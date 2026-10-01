import { useEffect, type ComponentType, type ReactNode } from "react";
import { createUseApiAvailability, type ApiAvailabilityStore } from "../hooks/use-api-availability";

/**
 * App-wide outage gate shared by the clinician app and the internal console.
 * While the API is confirmed unreachable every route (public and protected
 * alike) renders the warming screen instead of a shell that would immediately
 * fail its data calls; the route tree remounts untouched once the API answers
 * again. Apps bind it with `createApiAvailabilityGate(store, WarmingScreen)`.
 */
export function createApiAvailabilityGate(
  store: ApiAvailabilityStore,
  WarmingScreen: ComponentType,
): ComponentType<{ children: ReactNode }> {
  const useAvailability = createUseApiAvailability(store);

  return function ApiAvailabilityGate({ children }: { children: ReactNode }) {
    const { status, retryNow } = useAvailability();

    // Boot check: an app opened while the API is down (public routes included,
    // which make no request of their own) detects the outage right away. The
    // result only changes the UI when the readiness probe fails.
    useEffect(() => {
      retryNow();
    }, [retryNow]);

    if (status === "unavailable") {
      return <WarmingScreen />;
    }

    return <>{children}</>;
  };
}
