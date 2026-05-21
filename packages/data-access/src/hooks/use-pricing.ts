"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import {
  currentUsageSchema,
  pricingConfigResponseSchema,
  pricingEstimateResponseSchema,
  type CurrentUsage,
  type PricingConfigResponse,
  type PricingEstimateRequest,
  type PricingEstimateResponse,
} from "@workspace/types";
import { appQueryKeys } from "../lib/query-keys";
import { useAPIQueryValidated } from "../core/use-api-query-validated";
import { useDataAccessFetcher } from "../provider/hooks";

export type PricingConfig = PricingConfigResponse;
export type TierPricing = PricingConfig["tiers"][number];
export type EstimateRequest = PricingEstimateRequest;
export type EstimateResponse = PricingEstimateResponse;

export interface EstimateUsageInputs {
  consultations: number;
  users: number;
  whatsappMessages: number;
}

export function usePricingConfig(
  currency: string,
  options?: { enabled?: boolean },
) {
  const query = useAPIQueryValidated(
    appQueryKeys.pricing.config(currency),
    `/pricing/config?currency=${currency}`,
    pricingConfigResponseSchema,
    {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      enabled: options?.enabled ?? Boolean(currency),
    },
  );

  return {
    pricingConfig: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useEstimate(params: EstimateRequest | null) {
  const queryParams = params
    ? new URLSearchParams({
        tier: params.tier,
        ...(params.currency && { currency: params.currency }),
        billingCycle: params.billingCycle || "monthly",
        ...(params.consultations !== undefined && {
          consultations: String(params.consultations),
        }),
        ...(params.users !== undefined && { users: String(params.users) }),
        ...(params.whatsappMessages !== undefined && {
          whatsappMessages: String(params.whatsappMessages),
        }),
      }).toString()
    : null;

  const estimateKey = [
    "price-estimate",
    queryParams ?? "__disabled__",
  ] as const;

  const query = useAPIQueryValidated(
    estimateKey,
    queryParams ? `/pricing/estimate?${queryParams}` : "/pricing/estimate",
    pricingEstimateResponseSchema,
    {
      enabled: Boolean(queryParams),
      refetchOnWindowFocus: false,
    },
  );

  return {
    estimate: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useTierEstimates(params: {
  tiers: string[];
  currency: string;
  billingCycle: "monthly" | "yearly";
  usage: EstimateUsageInputs;
}) {
  const fetcher = useDataAccessFetcher();
  const { tiers, currency, billingCycle, usage } = params;

  const results = useQueries({
    queries: tiers.map((tier) => {
      const queryString = new URLSearchParams({
        tier,
        currency,
        billingCycle,
        consultations: String(usage.consultations),
        users: String(usage.users),
        whatsappMessages: String(usage.whatsappMessages),
      }).toString();

      return {
        queryKey: appQueryKeys.pricing.estimateTier(tier, queryString),
        queryFn: async () =>
          pricingEstimateResponseSchema.parse(
            await fetcher(`/pricing/estimate?${queryString}`),
          ),
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      };
    }),
  });

  const estimateByTier = tiers.reduce<Record<string, EstimateResponse | null>>(
    (acc, tier, index) => {
      acc[tier] = results[index]?.data ?? null;
      return acc;
    },
    {},
  );

  return {
    estimateByTier,
    isLoadingAny: results.some((result) => result.isLoading),
  };
}

export function useCurrentUsage(options?: { enabled?: boolean }) {
  const query = useAPIQueryValidated(
    appQueryKeys.pricing.subscriptionUsage(),
    "/subscriptions/usage",
    currentUsageSchema,
    {
      enabled: options?.enabled,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  );

  return {
    usage: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
