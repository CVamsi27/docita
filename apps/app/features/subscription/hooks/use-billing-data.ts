"use client";

import { usePermissionStore } from "@/lib/stores/permission-store";
import { useSubscription } from "@workspace/data-access";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import {
  usePricingConfig,
  useCurrentUsage,
} from "@/features/subscription/hooks/use-pricing";
import { computeSubscriptionDerivedState } from "./billing-subscription-workspace-helpers";

export function useBillingData() {
  const { currentTier, currentMode } = usePermissionStore();
  const { data: subscription, isLoading: isSubscriptionLoading } =
    useSubscription({ enabled: true });
  const { currency } = useLocaleCurrency();
  const { pricingConfig } = usePricingConfig(currency);
  const {
    usage,
    isLoading: isUsageLoading,
    error: usageError,
  } = useCurrentUsage();

  const derived = computeSubscriptionDerivedState(subscription, currentTier);

  return {
    currentTier,
    currentMode,
    subscription,
    isSubscriptionLoading,
    currency,
    pricingConfig,
    usage,
    isUsageLoading,
    usageError,
    derived,
  };
}
