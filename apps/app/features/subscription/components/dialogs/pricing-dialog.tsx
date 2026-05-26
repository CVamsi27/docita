"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Switch } from "@workspace/ui/components/form/switch";
import { Label } from "@workspace/ui/components/form/label";
import { cn } from "@workspace/ui/lib/utils";
import {
  PRICING_CURRENCY_CONFIG,
  CLINICAL_PLAN_LADDER,
  FRONT_DESK_PLAN_LADDER,
  type SupportedCurrency,
  Tier,
  type TierName,
} from "@workspace/types";
import {
  type TierPricing,
  usePricingConfig,
  useTierEstimates,
} from "@/features/subscription/hooks/use-pricing";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import {
  DEFAULT_PRICING_USAGE_INPUTS,
  PRICING_DIALOG_TIERS,
} from "@/features/subscription/config/pricing-config";
import {
  PricingDialogTierCard,
  resolvePricingDialogEstimate,
} from "./pricing-dialog-tier-card";

interface PricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: Tier;
  onSelectTier: (tier: TierName, cycle: "MONTHLY" | "YEARLY") => void;
  initialCurrency?: SupportedCurrency;
}

export function PricingDialog({
  open,
  onOpenChange,
  currentTier,
  onSelectTier,
  initialCurrency,
}: PricingDialogProps) {
  const { currency: detectedCurrency } = useLocaleCurrency();
  const currency: SupportedCurrency = initialCurrency ?? detectedCurrency;
  const [isYearly, setIsYearly] = useState(false);

  const { pricingConfig } = usePricingConfig(currency);

  const tiers: TierName[] = PRICING_DIALOG_TIERS;
  const tierGroups = [
    {
      title: "Clinical",
      description: "Full clinic workflows for doctors and care teams.",
      tiers: CLINICAL_PLAN_LADDER,
    },
    {
      title: "Front Desk Operations",
      description: "Reception, queues, appointments, billing, and shift handover.",
      tiers: FRONT_DESK_PLAN_LADDER,
    },
  ] as const;
  const currencyConfig = PRICING_CURRENCY_CONFIG[currency];
  const { estimateByTier, isLoadingAny } = useTierEstimates({
    tiers,
    currency,
    billingCycle: isYearly ? "yearly" : "monthly",
    usage: DEFAULT_PRICING_USAGE_INPUTS,
  });

  const getTierPricing = (tierName: TierName) => {
    const tierData = pricingConfig?.tiers.find(
      (t: TierPricing) => t.id === tierName,
    );
    return tierData?.pricing ?? { monthly: 0, yearly: 0 };
  };

  const getTierFeatures = (tierName: TierName) => {
    const tierData = pricingConfig?.tiers.find(
      (t: TierPricing) => t.id === tierName,
    );
    return tierData?.features?.slice(0, 4) ?? [];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-3">
          <DialogTitle className="ui-page-title">Choose Your Plan</DialogTitle>
          <DialogDescription>
            Select the plan that best fits your facility&apos;s needs
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-b border-border/50">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Auto currency:</span>
            <Badge variant="outline">
              {currencyConfig.symbol} {currency}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Label
              htmlFor="billing-toggle"
              className={cn(
                "text-sm transition-colors",
                !isYearly
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              Monthly
            </Label>
            <Switch
              id="billing-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <Label
              htmlFor="billing-toggle"
              className={cn(
                "text-sm transition-colors",
                isYearly
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              Yearly
            </Label>
            {isYearly ? (
              <Badge className="badge-success border">2 months free</Badge>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4 py-4">
          {tiers.map((tierName) => {
            const estimate = estimateByTier[tierName];
            const estimateValue = resolvePricingDialogEstimate(
              tierName,
              isYearly,
              estimateByTier[tierName],
            );

            return (
              <PricingDialogTierCard
                key={tierName}
                tierName={tierName}
                currentTier={currentTier}
                isYearly={isYearly}
                currency={currency}
                tierPricing={getTierPricing(tierName)}
                tierFeatures={getTierFeatures(tierName)}
                estimateValue={estimateValue}
                estimateSymbol={estimate?.currency.symbol ?? currencyConfig.symbol}
                locale={currencyConfig.locale}
                decimalPlaces={currencyConfig.decimalPlaces}
                onSelectTier={onSelectTier}
              />
            );
          })}
        </div>

        <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border/50">
          {isLoadingAny ? (
            <p className="mb-2">Updating usage estimates…</p>
          ) : null}
          <p>
            All plans include basic support. Enterprise customers get dedicated
            account management.
          </p>
          <p className="mt-1">
            Need help choosing?{" "}
            <button
              type="button"
              className="text-primary hover:underline font-medium"
              onClick={() => onOpenChange(false)}
            >
              Contact sales
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
