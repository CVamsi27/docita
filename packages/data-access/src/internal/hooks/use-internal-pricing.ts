import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { internalQueryKeys } from "../../lib/query-keys";
import { useDataAccessFetcher } from "../../provider/hooks";
import type {
  InternalClinicTierInfo,
  InternalPricingOfferRow,
  InternalPaymentTierPricingRow,
} from "../pricing.types";

export function useInternalTierPricing(
  token: string | null | undefined,
  fallbackTiers: InternalPaymentTierPricingRow[],
  options?: Omit<
    UseQueryOptions<InternalPaymentTierPricingRow[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.pricingTiers(),
    queryFn: async () => {
      try {
        const data = await fetcher<{ tiers?: InternalPaymentTierPricingRow[] }>(
          "/internal/tier-pricing",
        );
        return Array.isArray(data.tiers) ? data.tiers : fallbackTiers;
      } catch {
        return fallbackTiers;
      }
    },
    enabled: Boolean(token),
    ...options,
  });
}

export function useInternalBillingPricingOffers(
  token: string | null | undefined,
  options?: Omit<
    UseQueryOptions<InternalPricingOfferRow[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  const fetcher = useDataAccessFetcher();

  return useQuery({
    queryKey: internalQueryKeys.internal.billingPricingOffers(),
    queryFn: () =>
      fetcher<InternalPricingOfferRow[]>("/internal/billing/pricing/offers"),
    enabled: Boolean(token),
    ...options,
  });
}

export async function fetchInternalClinicTierInfo(
  fetcher: <T>(endpoint: string) => Promise<T>,
  clinicId: string,
): Promise<InternalClinicTierInfo> {
  return fetcher<InternalClinicTierInfo>(
    `/internal/clinics/${clinicId}/tier-info`,
  );
}

export async function fetchInternalPricingConfig(
  fetcher: <T>(endpoint: string) => Promise<T>,
  currency: string,
): Promise<{ tiers?: Array<{ id: string; pricing?: { monthly?: number } }> }> {
  return fetcher(`/pricing/config?currency=${currency}`);
}
