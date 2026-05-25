"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { useDebounce } from "@workspace/hooks";
import {
  PRICING_CURRENCY_CONFIG,
  type SupportedCurrency,
  type TierName,
} from "@workspace/types";
import { formatAmountLocale } from "@workspace/utils";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import {
  DEFAULT_PRICING_USAGE_INPUTS,
  PRICING_ESTIMATE_DEBOUNCE_MS,
  PRICING_ESTIMATOR_TIERS,
} from "@/features/subscription/config/pricing-config";
import {
  useEstimate,
  usePricingConfig,
} from "@/features/subscription/hooks/use-pricing";
import { DynamicPricingEstimatorInputs } from "./dynamic-pricing-estimator-inputs";
import { DynamicPricingEstimatorBreakdown } from "./dynamic-pricing-estimator-breakdown";
import type { EstimateUsageInputs } from "@/features/subscription/hooks/use-pricing";

interface DynamicPricingEstimatorProps {
  defaultTier?: TierName;
  currency?: SupportedCurrency;
  billingCycle?: "monthly" | "yearly";
  showCurrencySelector?: boolean;
  showBillingSelector?: boolean;
  onUsageChange?: (usage: EstimateUsageInputs) => void;
}

export function DynamicPricingEstimator({
  defaultTier = "ESSENTIAL",
  currency,
  billingCycle: controlledBillingCycle,
  showCurrencySelector = true,
  showBillingSelector = true,
  onUsageChange,
}: DynamicPricingEstimatorProps) {
  const { currency: detectedCurrency } = useLocaleCurrency();
  const [tier, setTier] = useState(defaultTier);
  const [selectedCurrency, setSelectedCurrency] =
    useState<SupportedCurrency>(currency ?? detectedCurrency);
  const [localBillingCycle, setLocalBillingCycle] = useState<
    "monthly" | "yearly"
  >("monthly");
  const [usage, setUsage] = useState({
    consultations: DEFAULT_PRICING_USAGE_INPUTS.consultations,
    users: DEFAULT_PRICING_USAGE_INPUTS.users,
    whatsappMessages: DEFAULT_PRICING_USAGE_INPUTS.whatsappMessages,
  });

  const { pricingConfig } = usePricingConfig(selectedCurrency);

  useEffect(() => {
    setTier(defaultTier);
  }, [defaultTier]);

  useEffect(() => {
    setSelectedCurrency(currency ?? detectedCurrency);
  }, [currency, detectedCurrency]);

  useEffect(() => {
    if (controlledBillingCycle) {
      setLocalBillingCycle(controlledBillingCycle);
    }
  }, [controlledBillingCycle]);

  const effectiveBillingCycle = controlledBillingCycle ?? localBillingCycle;

  useEffect(() => {
    onUsageChange?.(usage);
  }, [usage, onUsageChange]);

  const estimateParams = useMemo(
    () => ({
      tier,
      currency: selectedCurrency,
      billingCycle: effectiveBillingCycle,
      consultations: usage.consultations,
      users: usage.users,
      whatsappMessages: usage.whatsappMessages,
    }),
    [
      tier,
      selectedCurrency,
      effectiveBillingCycle,
      usage.consultations,
      usage.users,
      usage.whatsappMessages,
    ],
  );

  const debouncedEstimateParams = useDebounce(
    estimateParams,
    PRICING_ESTIMATE_DEBOUNCE_MS,
  );

  const { estimate, isLoading } = useEstimate(debouncedEstimateParams);

  const amtFmt = PRICING_CURRENCY_CONFIG[selectedCurrency];
  const fmtMoney = (value: number) =>
    formatAmountLocale(value, amtFmt.locale, {
      minimumFractionDigits: amtFmt.decimalPlaces,
      maximumFractionDigits: amtFmt.decimalPlaces,
    });

  const estimatorTierIds = new Set<string>(PRICING_ESTIMATOR_TIERS);
  const tiers = (pricingConfig?.tiers || [])
    .map((tierInfo) => tierInfo.id)
    .filter((tierId) => estimatorTierIds.has(tierId));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Estimate My Cost</CardTitle>
        <CardDescription>
          Your base plan price is fixed. This estimator calculates any additional
          charges if your usage exceeds the plan limits. All prices include 18%
          GST.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <DynamicPricingEstimatorInputs
          tier={tier}
          tiers={tiers}
          onTierChange={setTier}
          effectiveBillingCycle={effectiveBillingCycle}
          onBillingCycleChange={setLocalBillingCycle}
          showBillingSelector={showBillingSelector}
          selectedCurrency={selectedCurrency}
          onCurrencyChange={setSelectedCurrency}
          showCurrencySelector={showCurrencySelector}
          pricingConfig={pricingConfig}
          usage={usage}
          onUsageChange={setUsage}
        />
        <DynamicPricingEstimatorBreakdown
          effectiveBillingCycle={effectiveBillingCycle}
          isLoading={isLoading}
          estimate={estimate}
          fmtMoney={fmtMoney}
        />
      </CardContent>
    </Card>
  );
}
