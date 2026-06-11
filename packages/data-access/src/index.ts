export * from "./lib/types";
export type { RequestConfig } from "./lib/types";
export * from "./lib/errors";
export { createAPIClient } from "./lib/client-factory";
export { getAPIClient } from "./lib/singleton";
export { createCRUDResource } from "./lib/crud-resource";
export * from "./lib/browser-session";
export * from "./lib/query-keys";
export { toQueryString, withQueryString } from "./lib/query-string";
export type { QueryPrimitive, QueryValue, QueryParams } from "./lib/query-string";
export {
  IDEMPOTENCY_HEADER,
  generateIdempotencyKey,
  withIdempotencyKey,
} from "./lib/idempotency";

export { DataAccessProvider } from "./provider/data-access-provider";
export type { DataAccessConfig } from "./provider/context";
export {
  useDataAccessContext,
  useDataAccessFetcher,
} from "./provider/hooks";

export { useAPIQuery } from "./core/use-api-query";
export { useAPIQueryValidated } from "./core/use-api-query-validated";
export { QUERY_GC_TIMES, inferStaleTime } from "./core/stale-time";
export {
  useAPIMutation,
  type UseAPIMutationOptions,
} from "./core/use-api-mutation";

export type {
  AppConstants,
  MedicalHistoryTimelineItem,
} from "./types/app-types";

// hooks barrel
export * from "./hooks/use-analytics";
export * from "./hooks/use-appointments";
export * from "./hooks/use-doctor-delays";
export * from "./hooks/use-billing";
export * from "./hooks/use-billing-history";
export * from "./hooks/use-clinical";
export * from "./hooks/use-common";
export * from "./hooks/use-contact";
export * from "./hooks/use-dashboard";
export * from "./hooks/use-feature-flags";
export * from "./hooks/use-insurance-claims";
export * from "./hooks/use-import";
export * from "./hooks/use-inventory";
export * from "./hooks/use-leaves";
export * from "./hooks/use-medical-coding";
export * from "./hooks/use-notifications";
export * from "./hooks/use-patient-portal";
export * from "./hooks/use-patient-timeline";
export * from "./hooks/use-patient-tags";
export * from "./hooks/use-patients";
export * from "./hooks/use-patient-medical-history-mutations";
export * from "./hooks/use-patient-metrics";
export * from "./hooks/use-public-booking";
export * from "./hooks/use-clinic-settings";
export * from "./hooks/use-prescription-defaults";
export * from "./hooks/use-opd-slip-settings";
export * from "./hooks/use-doctors";
export * from "./hooks/use-doctor-availability";
export * from "./hooks/use-medical-coding-settings";
export * from "./hooks/use-subscription";
export * from "./hooks/use-pricing";
export * from "./hooks/use-subscription-billing-mutations";
export * from "./hooks/use-user-profile";
export * from "./hooks/use-signature-upload";
export * from "./hooks/use-whatsapp";
