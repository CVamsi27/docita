"use client";

import { useEffect, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import type { PricingEstimateRequest } from "@workspace/types";
import { API_URL } from "@/lib/api-config";

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
    appointments: number;
    storage: number;
    users: number;
  };
  features?: string[];
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
    queryFn: () =>
      fetcher(`${PRICING_API_BASE_URL}/pricing/config?currency=${currency}`),
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

const CURRENCY_CACHE_KEY = "docita_currency_detected";
const CURRENCY_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedCurrency {
  code: string;
  timestamp: number;
}

const IP_TO_CURRENCY_MAP: Record<string, string> = {
  IN: "INR",
  US: "USD",
  CA: "USD",
  GB: "GBP",
  AU: "AUD",
  NZ: "AUD",
  DE: "EUR",
  FR: "EUR",
  IT: "EUR",
  ES: "EUR",
  NL: "EUR",
  BE: "EUR",
  AT: "EUR",
  PT: "EUR",
  IE: "EUR",
  FI: "EUR",
  GR: "EUR",
};

async function detectCurrencyFromIP(): Promise<string> {
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) return "INR";
    const data = await res.json();
    return IP_TO_CURRENCY_MAP[data.country_code] ?? "INR";
  } catch {
    return "INR";
  }
}

export function useDetectedCurrency(): string {
  const [currency, setCurrency] = useState<string>("INR");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const cached = localStorage.getItem(CURRENCY_CACHE_KEY);
    if (cached) {
      try {
        const parsed: CachedCurrency = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CURRENCY_CACHE_TTL_MS) {
          setCurrency(parsed.code);
          return;
        }
      } catch {
        // ignore corrupt cache
      }
    }

    detectCurrencyFromIP().then((code) => {
      setCurrency(code);
      localStorage.setItem(
        CURRENCY_CACHE_KEY,
        JSON.stringify({ code, timestamp: Date.now() } satisfies CachedCurrency),
      );
    });
  }, []);

  return currency;
}

export type {
  PricingConfig,
  TierPricing,
  AddOnInfo,
  EstimateRequest,
  EstimateResponse,
};
