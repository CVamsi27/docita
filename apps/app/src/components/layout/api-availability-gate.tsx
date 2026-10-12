import { createApiAvailabilityGate } from "@workspace/data-access";
import { getApiAvailabilityStore } from "@/lib/api/api-availability";
import { ServerWarmingScreen } from "@/components/loaders/server-warming-screen";

/**
 * App-wide outage gate. While the API is confirmed unreachable every route
 * (public and protected alike) renders the warming screen instead of a shell
 * that would immediately fail its data calls; the route tree remounts
 * untouched once the API answers again.
 */
export const ApiAvailabilityGate = createApiAvailabilityGate(
  getApiAvailabilityStore,
  ServerWarmingScreen,
);
