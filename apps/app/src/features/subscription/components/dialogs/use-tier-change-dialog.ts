"use client";

import { useState } from "react";
import { PRICING_CURRENCY_CONFIG, TIER_INFO } from "@workspace/types";
import { getTierName, getUserFacingErrorMessage } from "@workspace/utils";
import {
  type TierPricing,
  usePricingConfig,
} from "@/features/subscription/hooks/use-pricing";
import { useProrationPreview } from "@workspace/data-access";
import { formatPriceWithCurrency } from "@workspace/utils";
import { getTierFeatureDelta } from "@/features/subscription/lib/feature-delta";
import { getClinicTimezoneOrDefault } from "@/lib/utils/clinic-timezone";
import { useOptionalClinic } from "@/lib/contexts/clinic-context";
import { formatLocaleDateShortMonthYear } from "@/lib/formatters";
import {
  type TierChangeDialogProps,
  PLAN_TIER_RANK,
} from "./tier-change-dialog-types";

export function useTierChangeDialog({
  open,
  onOpenChange,
  currentTier,
  selectedTier,
  billingCycle,
  currency,
  onConfirm,
  onSchedule,
  currentPeriodEnd,
  checkoutInFlight = false,
}: TierChangeDialogProps) {
  const clinicTimezone = getClinicTimezoneOrDefault(useOptionalClinic()?.clinic);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timing, setTiming] = useState<"now" | "at-renewal">("at-renewal");

  const currencyConfig = PRICING_CURRENCY_CONFIG[currency];
  const { pricingConfig, isLoading: pricingLoading } =
    usePricingConfig(currency);

  const { data: prorationPreview, isFetching: prorationLoading } =
    useProrationPreview(selectedTier ?? "STARTER", billingCycle, {
      enabled: open && !!selectedTier && selectedTier !== "ENTERPRISE",
    });

  const currentTierName = getTierName(currentTier);
  const currentInfo = TIER_INFO[currentTierName];
  const selectedInfo = selectedTier ? TIER_INFO[selectedTier] : null;
  const currentRank = PLAN_TIER_RANK[currentTierName] ?? 0;
  const selectedRank = selectedTier ? (PLAN_TIER_RANK[selectedTier] ?? 0) : 0;

  const isUpgrade = selectedRank > currentRank;
  const isDowngrade = selectedRank < currentRank;

  const currentTierData = pricingConfig?.tiers.find(
    (t: TierPricing) => t.id === currentTierName,
  );
  const selectedTierData = pricingConfig?.tiers.find(
    (t: TierPricing) => t.id === selectedTier,
  );
  const currentPrice =
    billingCycle === "YEARLY"
      ? (currentTierData?.pricing?.yearly ?? 0)
      : (currentTierData?.pricing?.monthly ?? 0);
  const selectedPrice =
    billingCycle === "YEARLY"
      ? (selectedTierData?.pricing?.yearly ?? 0)
      : (selectedTierData?.pricing?.monthly ?? 0);
  const currentHasCustomPricing =
    currentTierName === "ENTERPRISE" || currentPrice === "custom";
  const selectedHasCustomPricing =
    selectedTier === "ENTERPRISE" || selectedPrice === "custom";

  const formatPrice = (price: number | "custom") =>
    formatPriceWithCurrency(price, currency);

  const priceDiff =
    !currentHasCustomPricing &&
    !selectedHasCustomPricing &&
    typeof currentPrice === "number" &&
    typeof selectedPrice === "number"
      ? selectedPrice - currentPrice
      : null;

  const cycleSuffix = billingCycle === "YEARLY" ? "/yr" : "/mo";

  const featureDelta = selectedTier
    ? getTierFeatureDelta(currentTierName, selectedTier)
    : { gained: [], lost: [] };

  const formattedRenewalDate = currentPeriodEnd
    ? formatLocaleDateShortMonthYear(currentPeriodEnd, clinicTimezone)
    : null;

  const busy = isLoading || checkoutInFlight;

  const handleClose = () => {
    if (!busy) {
      setSuccess(false);
      setError(null);
      onOpenChange(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedTier) return;
    setIsLoading(true);
    setError(null);

    try {
      if (isDowngrade && timing === "at-renewal" && onSchedule) {
        await onSchedule();
      } else {
        await onConfirm();
      }
      setSuccess(true);
    } catch (err) {
      setError(
        getUserFacingErrorMessage(err, {
          fallback:
            "We could not change your plan right now. Please try again.",
          context: "payment",
        }),
      );
    } finally {
      setIsLoading(false);
    }
  };

  return {
    success,
    error,
    timing,
    setTiming,
    pricingLoading,
    pricingConfig,
    prorationPreview,
    prorationLoading,
    currencyConfig,
    currentTierName,
    currentInfo,
    selectedInfo,
    isUpgrade,
    isDowngrade,
    currentTierData,
    selectedTierData,
    currentPrice,
    selectedPrice,
    currentHasCustomPricing,
    selectedHasCustomPricing,
    formatPrice,
    priceDiff,
    cycleSuffix,
    featureDelta,
    formattedRenewalDate,
    busy,
    handleClose,
    handleConfirm,
  };
}
