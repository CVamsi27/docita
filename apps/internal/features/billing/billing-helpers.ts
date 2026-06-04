// check-as-cast-density: allow-file — narrowing casts required by generic signatures or external types
import { getUserFacingErrorMessage } from "@workspace/utils";

export const DEFAULT_EXTEND_DAYS = 3;

export function buildSubscriptionFilters(
  tierFilter: string,
  statusFilter: string,
  billingCycleFilter: string,
) {
  const filters = {
    tier: tierFilter !== "all" ? tierFilter : undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    billingCycle:
      billingCycleFilter !== "all" ? billingCycleFilter : undefined,
  };
  return { filters, filtersKey: JSON.stringify(filters) };
}

export function deriveSubscriptionPageStatus(
  authLoading: boolean,
  token: string | null,
  metricsLoading: boolean,
  subscriptionsLoading: boolean,
  paymentsLoading: boolean,
  metricsError: unknown,
  subscriptionsError: unknown,
  paymentsError: unknown,
) {
  const loading =
    authLoading ||
    (Boolean(token) &&
      (metricsLoading || subscriptionsLoading || paymentsLoading));
  const queryError = (metricsError ??
    subscriptionsError ??
    paymentsError) as Error | null;
  const errorMessage = queryError
    ? getUserFacingErrorMessage(queryError, {
        context: "load",
        fallback:
          "We could not load billing data. Please refresh and try again.",
      })
    : undefined;
  const pageStatus: "loading" | "error" | "success" = loading
    ? "loading"
    : queryError
      ? "error"
      : "success";
  return { loading, errorMessage, pageStatus };
}
