import {
  useCurrentUsage as useCurrentUsageBase,
  useEstimate,
  usePricingConfig as usePricingConfigBase,
  useTierEstimates,
  type TierPricing,
} from "@workspace/data-access";

export type {
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
