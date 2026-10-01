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
 * React runs child effects before parent effects, so every provider mounted
 * below (session bootstrap, socket, public data) issues its own requests before
 * the gate's boot effect can; those hung requests take the origin's connection
 * slots and leave the readiness probe unsent until its abort fires. Starting
 * the check here makes it the app's first request.
 */
export function startApiAvailabilityCheck(): void {
  availability.retryNow();
}

export { isPlatformOutageError } from "@workspace/data-access";
