import {
  useCurrentUsage as useCurrentUsageBase,
  usePricingConfig as usePricingConfigBase,
  type TierPricing,
} from "@workspace/data-access";

export type {
  TierPricing,
};

export function usePricingConfig(currency?: string) {
  const resolvedCurrency = currency ?? "INR";
  return usePricingConfigBase(resolvedCurrency);
}


export function useCurrentUsage() {
  return useCurrentUsageBase({ enabled: true });
}
