"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import type { PricingEstimateRequest } from "@workspace/types";

const API_URL =
  process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001/api";

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
    appointments: number;
    storage: number;
    users: number;
  };
}

interface AddOnInfo {
  id: string;
  name: string;
  description: string;
  pricing?: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  pricingByTier?: Record<
    string,
    { monthly: number | string; yearly: number | string }
  >;
}

interface PricingConfig {
  currency: {
    code: string;
    symbol: string;
    name: string;
  };
  supportedCurrencies: Array<{ code: string; symbol: string; name: string }>;
  tiers: TierPricing[];
  addOns: AddOnInfo[];
  discounts: {
    annualPercent: number;
    semiAnnualPercent: number;
    referralCredits: number;
  };
}

type EstimateRequest = PricingEstimateRequest;

export interface EstimateUsageInputs {
  patients: number;
  appointments: number;
  users: number;
  whatsapp: boolean;
  whatsappMessages: number;
  intelligence: boolean;
  aiCredits: number;
}

interface EstimateResponse {
  tier: string;
  billingCycle: string;
  currency: { code: string; symbol: string };
  breakdown: {
    basePrice: number;
    addOns: Record<string, { base: number; overage: number }>;
    addOnTotal: number;
    discount: { percent: number; amount: number };
    subtotal: number;
    overages: {
      patients: { count: number; charge: number };
      appointments: { count: number; charge: number };
      users: { count: number; charge: number };
    };
    overageTotal: number;
  };
  totalMonthly: number;
  totalYearly: number;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch pricing");
  return res.json();
};

export function usePricingConfig(currency: string = "INR") {
  const { data, error, isLoading, refetch } = useQuery<PricingConfig>({
    queryKey: ["pricing-config", currency],
    queryFn: () => fetcher(`${API_URL}/pricing/config?currency=${currency}`),
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
        ...(params.patients !== undefined && {
          patients: String(params.patients),
        }),
        ...(params.appointments !== undefined && {
          appointments: String(params.appointments),
        }),
        ...(params.users !== undefined && { users: String(params.users) }),
        ...(params.whatsapp && { whatsapp: String(params.whatsapp) }),
        ...(params.whatsappMessages !== undefined && {
          whatsappMessages: String(params.whatsappMessages),
        }),
        ...(params.intelligence && {
          intelligence: String(params.intelligence),
        }),
        ...(params.aiCredits !== undefined && {
          aiCredits: String(params.aiCredits),
        }),
      }).toString()
    : null;

  const { data, error, isLoading } = useQuery<EstimateResponse>({
    queryKey: ["price-estimate", queryParams],
    queryFn: () => fetcher(`${API_URL}/pricing/estimate?${queryParams}`),
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
        patients: String(usage.patients),
        appointments: String(usage.appointments),
        users: String(usage.users),
        whatsapp: String(usage.whatsapp),
        whatsappMessages: String(usage.whatsappMessages),
        intelligence: String(usage.intelligence),
        aiCredits: String(usage.aiCredits),
      }).toString();

      return {
        queryKey: ["price-estimate", tier, queryString],
        queryFn: () => fetcher(`${API_URL}/pricing/estimate?${queryString}`),
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

export type {
  PricingConfig,
  TierPricing,
  AddOnInfo,
  EstimateRequest,
  EstimateResponse,
};
