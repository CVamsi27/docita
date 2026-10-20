import { createApiAvailability } from "@workspace/data-access";
import { API_URL } from "./api-config";

/**
 * Console binding of the shared API-availability machinery; the policy and
 * the probing live in `@workspace/data-access` — this file only supplies the
 * console's API base. Excluded from the duplication gate in .jscpd.json
 * because just that one line differs between the apps.
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
