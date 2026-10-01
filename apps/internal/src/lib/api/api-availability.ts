import { createApiAvailability } from "@workspace/data-access";
import { API_URL } from "./api-config";

/**
 * Platform-level outage detection for the internal console.
 *
 * Binds the shared machinery in `@workspace/data-access` to the console's API
 * base: only 502/503/504 responses and network/timeout failures count as an
 * outage, every suspicion is confirmed with a `/health/ready` probe
 * (verify-before-alarm), and while the API is down the store keeps probing
 * with backoff until it comes back. Application errors (400/401/404/500) mean
 * the API answered, so they never blank the workspace.
 *
 * All logic lives in the shared package; only this one binding line differs
 * between the apps (their API base resolvers), so the module is excluded from
 * the duplication gate in .jscpd.json.
 */

const availability = createApiAvailability(() => API_URL);

/** Store accessors and the bound hook, all from one shared factory. */
export const {
  store: getApiAvailabilityStore,
  trackResponse: trackApiResponse,
  reportUnavailable: reportApiUnavailable,
  useApiAvailability,
} = availability;

export { isPlatformOutageError } from "@workspace/data-access";
