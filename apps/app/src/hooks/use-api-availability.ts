/**
 * App binding of the shared availability hook (see
 * `@workspace/data-access` `createUseApiAvailability`). The store lives in
 * `@/lib/api/api-availability` so client wiring and the hook share one state.
 */
export { useApiAvailability } from "@/lib/api/api-availability";
