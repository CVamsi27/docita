"use client";

import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import { useAuth } from "@/lib/auth/auth-context";
import {
  useCurrentUsage as useCurrentUsageBase,
  useEstimate,
  usePricingConfig as usePricingConfigBase,
  useTierEstimates,
  type EstimateRequest,
  type EstimateResponse,
  type EstimateUsageInputs,
  type PricingConfig,
  type TierPricing,
} from "@workspace/data-access";

export type {
  EstimateRequest,
  EstimateResponse,
  EstimateUsageInputs,
  PricingConfig,
  TierPricing,
};

export function usePricingConfig(currency?: string) {
  const { currency: detectedCurrency } = useLocaleCurrency();
  const resolvedCurrency = currency ?? detectedCurrency;
  return usePricingConfigBase(resolvedCurrency);
}

export { useEstimate, useTierEstimates };

export function useCurrentUsage() {
  const { token } = useAuth();
  return useCurrentUsageBase({ enabled: !!token });
}
