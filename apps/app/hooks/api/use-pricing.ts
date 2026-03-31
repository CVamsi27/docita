"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import type {
  CurrentUsage,
  PricingEstimateRequest,
  PricingEstimateResponse,
} from "@workspace/types";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { API_URL } from "@/lib/api-config";
import { useAuth } from "@/lib/auth-context";
import { fetchJsonWithSession } from "@/lib/fetch-with-session";

function getVersionedApiBaseUrl(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/, "");

  if (/\/api$/i.test(normalized)) {
    return `${normalized}/v1`;
  }

  return normalized;
}

const PRICING_API_BASE_URL = getVersionedApiBaseUrl(API_URL);

interface TierPricing {
  id: string;
  name: string;
  description: string;
  tagline: string;
  color: string;
  pricing: {
    monthly: number | "custom";
    yearly: number | "custom";
    currency: string;
  };
  limits: {
    patients: number;
    doctors: number;
    branches: number;
    appointments: number;
    storage: number;
    users: number;
    prescriptions?: number;
    invoices?: number;
    billable?: {
      consultations: number;
      users: number;
      whatsappMessages: number;
    };
  };
  features?: string[];
}

interface PricingConfig {
  currency: {
    code: string;
    symbol: string;
    name: string;
  };
  supportedCurrencies: Array<{ code: string; symbol: string; name: string }>;
  tiers: TierPricing[];
  discounts: {
    annualPercent: number;
    semiAnnualPercent: number;
    referralCredits: number;
  };
}

type EstimateRequest = PricingEstimateRequest;

export interface EstimateUsageInputs {
  consultations: number;
  users: number;
  whatsappMessages: number;
}

type EstimateResponse = PricingEstimateResponse;

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch pricing");
  return res.json();
};

export function usePricingConfig(currency?: string) {
  const { currency: detectedCurrency } = useLocaleCurrency();
  const resolvedCurrency = currency ?? detectedCurrency;

  const { data, error, isLoading, refetch } = useQuery<PricingConfig>({
    queryKey: ["pricing-config", resolvedCurrency],
    queryFn: () =>
      fetcher(
        `${PRICING_API_BASE_URL}/pricing/config?currency=${resolvedCurrency}`,
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
    queryFn: () =>
      fetcher(`${PRICING_API_BASE_URL}/pricing/estimate?${queryParams}`),
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
        queryFn: () =>
          fetcher(`${PRICING_API_BASE_URL}/pricing/estimate?${queryString}`),
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
    queryFn: () => fetchJsonWithSession<CurrentUsage>("/subscriptions/usage"),
    enabled: !!token,
    staleTime: 60000,
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
