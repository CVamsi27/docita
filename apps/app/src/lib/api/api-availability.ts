import { createApiAvailability } from "@workspace/data-access";
import { getAppApiUrl } from "./api-config";

/**
 * App binding of the shared API-availability machinery; the policy and the
 * probing live in `@workspace/data-access` — this file only supplies the
 * app's API base. Excluded from the duplication gate in .jscpd.json because
 * just that one line differs between the apps.
 */

const availability = createApiAvailability(getAppApiUrl);

/** Store accessors and the bound hook, all from one shared factory. */
export const {
  store: getApiAvailabilityStore,
  trackResponse: trackApiResponse,
  reportUnavailable: reportApiUnavailable,
  useApiAvailability,
} = availability;

/**
 * Start the availability check from the entry module, before the app renders.
 * The gate lives inside the lazily loaded route tree, so it mounts — and runs
 * its boot effect — a commit after the providers above it, which by then have
 * already issued their session/socket requests. With the API hung, the outage
 * screen would only appear once the probe was issued at that later point;
 * starting the check here makes it the app's first request.
 */
export function startApiAvailabilityCheck(): void {
  availability.retryNow();
}

export { isPlatformOutageError } from "@workspace/data-access";
