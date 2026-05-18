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
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { useAuth } from "@/lib/auth/auth-context";
import { fetchJsonWithSession } from "@/lib/auth/fetch-with-session";
import { apiFetch } from "@/lib/api/api-client";

type EstimateRequest = PricingEstimateRequest;

export interface EstimateUsageInputs {
  consultations: number;
  users: number;
  whatsappMessages: number;
}

type EstimateResponse = PricingEstimateResponse;
type PricingConfig = PricingConfigResponse;
type TierPricing = PricingConfig["tiers"][number];

const fetcher = async <T>(endpoint: string) => {
  return await apiFetch<T>(endpoint, { method: "GET" });
};

export function usePricingConfig(currency?: string) {
  const { currency: detectedCurrency } = useLocaleCurrency();
  const resolvedCurrency = currency ?? detectedCurrency;

  const { data, error, isLoading, refetch } = useQuery<PricingConfig>({
    queryKey: ["pricing-config", resolvedCurrency],
    queryFn: async () =>
      pricingConfigResponseSchema.parse(
        await fetcher<unknown>(`/pricing/config?currency=${resolvedCurrency}`),
      ),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  return {
    pricingConfig: data,
    isLoading,
    error,
    refetch,
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

  const { data, error, isLoading } = useQuery<EstimateResponse>({
    queryKey: ["price-estimate", queryParams],
    queryFn: async () =>
      pricingEstimateResponseSchema.parse(
        await fetcher<unknown>(`/pricing/estimate?${queryParams}`),
      ),
    enabled: !!queryParams,
    refetchOnWindowFocus: false,
  });

  return {
    estimate: data,
    isLoading,
    error,
  };
}

export function useTierEstimates(params: {
  tiers: string[];
  currency: string;
  billingCycle: "monthly" | "yearly";
  usage: EstimateUsageInputs;
}) {
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
        queryKey: ["price-estimate", tier, queryString],
        queryFn: async () =>
          pricingEstimateResponseSchema.parse(
            await fetcher<unknown>(`/pricing/estimate?${queryString}`),
          ),
        staleTime: 30000,
        refetchOnWindowFocus: false,
      };
    }),
  });

  const estimateByTier = tiers.reduce<Record<string, EstimateResponse | null>>(
    (acc, tier, index) => {
      const data = results[index]?.data as EstimateResponse | undefined;
      acc[tier] = data ?? null;
      return acc;
    },
    {},
  );

  return {
    estimateByTier,
    isLoadingAny: results.some((result) => result.isLoading),
  };
}

export function useCurrentUsage() {
  const { token } = useAuth();

  const { data, isLoading, error, refetch } = useQuery<CurrentUsage>({
    queryKey: ["subscription-usage"],
    queryFn: async () =>
      currentUsageSchema.parse(
        await fetchJsonWithSession<unknown>("/subscriptions/usage"),
      ),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return { usage: data, isLoading, error, refetch };
}

export type {
  PricingConfig,
  TierPricing,
  EstimateRequest,
  EstimateResponse,
};
