"use client";

import { useQuery } from "@tanstack/react-query";

const API_URL = process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001/api";

// Types matching backend response
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
  pricingByTier?: Record<string, { monthly: number | string; yearly: number | string }>;
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

interface EstimateRequest {
  tier: string;
  billingCycle?: "monthly" | "yearly";
  patients?: number;
  appointments?: number;
  users?: number;
  whatsapp?: boolean;
  whatsappMessages?: number;
  intelligence?: boolean;
  aiCredits?: number;
}

interface EstimateResponse {
  tier: string;
  billingCycle: string;
  currency: { code: string; symbol: string };
  breakdown: {
    basePrice: number;
    overageEstimate: number;
    addons: number;
    addonsDetail: Record<string, number>;
    discount: { percent: number; amount: number };
    subtotal: number;
    tax: number;
    taxPercent: number;
    total: number;
  };
  limits: {
    patients: number;
    appointments: number;
    storage: number;
    users: number;
  };
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch pricing");
  return res.json();
};

/**
 * Hook to fetch pricing configuration from backend
 */
export function usePricingConfig(currency: string = "INR") {
  const { data, error, isLoading, refetch } = useQuery<PricingConfig>({
    queryKey: ["pricing-config", currency],
    queryFn: () => fetcher(`${API_URL}/pricing/config?currency=${currency}`),
    staleTime: 60000, // Cache for 1 minute
    refetchOnWindowFocus: false,
  });

  return {
    pricingConfig: data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to calculate price estimate from backend
 */
export function useEstimate(params: EstimateRequest | null) {
  const queryParams = params
    ? new URLSearchParams({
        tier: params.tier,
        billingCycle: params.billingCycle || "monthly",
        ...(params.patients && { patients: String(params.patients) }),
        ...(params.appointments && { appointments: String(params.appointments) }),
        ...(params.users && { users: String(params.users) }),
        ...(params.whatsapp && { whatsapp: String(params.whatsapp) }),
        ...(params.whatsappMessages && { whatsappMessages: String(params.whatsappMessages) }),
        ...(params.intelligence && { intelligence: String(params.intelligence) }),
        ...(params.aiCredits && { aiCredits: String(params.aiCredits) }),
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

export type { PricingConfig, TierPricing, AddOnInfo, EstimateRequest, EstimateResponse };
