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
  const resolvedCurrency = currency ?? "INR";
  return usePricingConfigBase(resolvedCurrency);
}

export { useEstimate, useTierEstimates };

export function useCurrentUsage() {
  return useCurrentUsageBase({ enabled: true });
}
