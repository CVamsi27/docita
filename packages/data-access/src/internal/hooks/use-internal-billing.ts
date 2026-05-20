import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type {
  InternalBillingPaymentItem,
  InternalBillingPaymentsQuery,
  InternalBillingSubscriptionsQuery,
} from "@workspace/types";
import { internalQueryKeys } from "../../lib/query-keys";
import { useDataAccessFetcher } from "../../provider/hooks";
import type {
  InternalBillingMetrics,
  InternalSubscriptionOverview,
  InternalTierPricingRow,
} from "../billing.types";

export function useInternalBillingMetrics(
  token: string | null | undefined,
  options?: Omit<
    UseQueryOptions<InternalBillingMetrics, Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.billingMetrics(),
    queryFn: () => fetcher<InternalBillingMetrics>("/internal/billing/metrics"),
    enabled: Boolean(token),
    ...options,
  });
}

export function useInternalBillingSubscriptions(
  token: string | null | undefined,
  filtersKey: string,
  filters?: InternalBillingSubscriptionsQuery,
  options?: Omit<
    UseQueryOptions<InternalSubscriptionOverview[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.billingSubscriptions(filtersKey),
    queryFn: () =>
      fetcher<InternalSubscriptionOverview[]>(
        "/internal/billing/subscriptions",
        {
          params: filters as Record<
            string,
            string | number | boolean | undefined
          >,
        },
      ),
    enabled: Boolean(token),
    ...options,
  });
}

export function useInternalBillingPayments(
  token: string | null | undefined,
  filtersKey: string,
  filters?: InternalBillingPaymentsQuery,
  options?: Omit<
    UseQueryOptions<InternalBillingPaymentItem[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.billingPayments(filtersKey),
    queryFn: () =>
      fetcher<InternalBillingPaymentItem[]>("/internal/billing/payments", {
        params: filters as Record<
          string,
          string | number | boolean | undefined
        >,
      }),
    enabled: Boolean(token),
    ...options,
  });
}

export function useInternalBillingPricingTiers(
  token: string | null | undefined,
  options?: Omit<
    UseQueryOptions<InternalTierPricingRow[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.billingPricingTiers(),
    queryFn: () =>
      fetcher<InternalTierPricingRow[]>("/internal/billing/pricing/tiers"),
    enabled: Boolean(token),
    ...options,
  });
}
