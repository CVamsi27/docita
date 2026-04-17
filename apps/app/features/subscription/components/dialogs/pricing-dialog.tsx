"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Switch } from "@workspace/ui/components/switch";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";
import { Check } from "lucide-react";
import {
  PRICING_CURRENCY_CONFIG,
  type SupportedCurrency,
  Tier,
  TIER_INFO,
  TIER_LIMITS,
  type TierName,
} from "@workspace/types";
import {
  type TierPricing,
  usePricingConfig,
  useTierEstimates,
} from "@/hooks/api/use-pricing";
import { useLocaleCurrency } from "@/hooks/use-locale-currency";
import {
  DEFAULT_PRICING_USAGE_INPUTS,
  PRICING_DIALOG_TIER_BORDERS,
  PRICING_DIALOG_TIER_GRADIENTS,
  PRICING_DIALOG_TIER_ICONS,
  PRICING_DIALOG_TIERS,
} from "@/features/subscription/config/pricing-config";

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
  const TIER_ICON_CLASSES: Record<TierName, string> = {
    STARTER: "tier-capture",
    ESSENTIAL: "tier-core",
    PROFESSIONAL: "tier-pro",
    ENTERPRISE: "tier-enterprise",
    INTELLIGENCE: "tier-intelligence",
  };

  const { currency: detectedCurrency } = useLocaleCurrency();
  const currency: SupportedCurrency = initialCurrency ?? detectedCurrency;
  const [isYearly, setIsYearly] = useState(false);

  const { pricingConfig } = usePricingConfig(currency);

  const tiers: TierName[] = PRICING_DIALOG_TIERS;
  const currencyConfig = PRICING_CURRENCY_CONFIG[currency];
  const { estimateByTier, isLoadingAny } = useTierEstimates({
    tiers,
    currency,
    billingCycle: isYearly ? "yearly" : "monthly",
    usage: DEFAULT_PRICING_USAGE_INPUTS,
  });

  const formatPrice = (price: number | "custom") => {
    if (price === "custom") return "Custom";
    return new Intl.NumberFormat(currencyConfig.locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: currencyConfig.decimalPlaces,
      maximumFractionDigits: currencyConfig.decimalPlaces,
    }).format(price);
  };

  const getTierNumeric = (tierName: TierName): Tier => {
    return Tier[tierName as keyof typeof Tier];
  };

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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-linear-to-br from-background via-background to-muted/30">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-bold bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
            Choose Your Plan
          </DialogTitle>
          <DialogDescription>
            Select the plan that best fits your facility&apos;s needs
          </DialogDescription>
        </DialogHeader>
        {}
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
            {isYearly && (
              <Badge className="badge-success border">
                2 months free
              </Badge>
            )}
          </div>
        </div>

        {}
        <div className="flex flex-wrap justify-center gap-4 py-4">
          {tiers.map((tierName, index) => {
            const info = TIER_INFO[tierName];
            const tierPricing = getTierPricing(tierName);
            const limits = TIER_LIMITS[tierName];
            const Icon = PRICING_DIALOG_TIER_ICONS[tierName];
            const tierNumeric = getTierNumeric(tierName);
            const isCurrentTier = tierNumeric === currentTier;
            const isUpgrade = tierNumeric > currentTier;
            const isDowngrade = tierNumeric < currentTier;
            const tierFeatures = getTierFeatures(tierName);

            const price = isYearly ? tierPricing.yearly : tierPricing.monthly;
            const isCustomTier = tierName === "ENTERPRISE" || price === "custom";
            const monthlyEquivalent =
              isYearly && typeof price === "number" ? price / 12 : price;

            return (
              <div
                key={tierName}
                style={{ animationDelay: `${index * 50}ms` }}
                className={cn(
                  "relative flex w-full max-w-[280px] flex-col rounded-xl border-2 p-4",
                  "bg-linear-to-br backdrop-blur-sm",
                  "transition-all duration-300 ease-out",
                  "hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-4",
                  PRICING_DIALOG_TIER_GRADIENTS[tierName],
                  PRICING_DIALOG_TIER_BORDERS[tierName],
                  isCurrentTier &&
                    "ring-2 ring-primary ring-offset-2 ring-offset-background",
                )}
              >
                {isCurrentTier && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground z-10">
                    Current
                  </Badge>
                )}

                {}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      TIER_ICON_CLASSES[tierName],
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{info.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {info.tagline}
                    </p>
                  </div>
                </div>

                {}
                <div
                  key={isYearly ? "yearly" : "monthly"}
                  className="mb-4 animate-in fade-in slide-in-from-left-2 duration-200"
                >
                  {isCustomTier ? (
                    <div className="text-2xl font-bold">Custom</div>
                  ) : (
                    <>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold">
                          {formatPrice(monthlyEquivalent as number)}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          /mo
                        </span>
                      </div>
                      {isYearly && (
                        <p className="text-xs text-muted-foreground">
                          {formatPrice(price)} billed yearly
                        </p>
                      )}
                    </>
                  )}
                </div>

                {(() => {
                  if (tierName === "ENTERPRISE") {
                    return null;
                  }

                  const estimate = estimateByTier[tierName];
                  const estimateValue =
                    estimate && typeof estimate.totalMonthly === "number"
                      ? isYearly
                        ? estimate.totalYearly
                        : estimate.totalMonthly
                      : null;

                  if (estimateValue === null) {
                    return null;
                  }

                  return (
                    <div className="mb-3 rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5">
                      <p className="text-[11px] text-muted-foreground">
                        Est. with your usage
                      </p>
                      <p className="text-sm font-semibold text-foreground">
                        {estimate?.currency.symbol}
                        {estimateValue.toLocaleString()}
                        {isYearly ? "/yr" : "/mo"}
                      </p>
                    </div>
                  );
                })()}

                {}
                <div className="space-y-2 mb-4 flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    <span>
                      {limits.patients === 999999
                        ? "Unlimited"
                        : limits.patients.toLocaleString()}{" "}
                      patients
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    <span>
                      {limits.doctors === 999 ? "Unlimited" : limits.doctors}{" "}
                      doctor
                      {limits.doctors !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    <span>{limits.storageGB} GB storage</span>
                  </div>
                  {limits.appointments && (
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-success" />
                      <span>
                        {limits.appointments === 999999
                          ? "Unlimited"
                          : limits.appointments.toLocaleString()}{" "}
                        consultations/mo
                      </span>
                    </div>
                  )}

                  {tierFeatures.length > 0 && (
                    <div className="pt-2">
                      <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                        Highlights
                      </p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {tierFeatures.map((feature) => (
                          <li key={`${tierName}-${feature}`} className="truncate">
                            • {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {}
                <Button
                  className={cn(
                    "w-full mt-auto",
                    isCurrentTier && "bg-muted text-muted-foreground",
                    isUpgrade &&
                      "bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
                    isDowngrade && "bg-muted/50 hover:bg-muted",
                  )}
                  variant={isDowngrade ? "outline" : "default"}
                  disabled={isCurrentTier}
                  onClick={() =>
                    onSelectTier(tierName, isYearly ? "YEARLY" : "MONTHLY")
                  }
                >
                  {isCurrentTier
                    ? "Current Plan"
                    : isUpgrade
                      ? "Upgrade"
                      : "Downgrade"}
                </Button>
              </div>
            );
          })}
        </div>

        <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border/50">
          {isLoadingAny && <p className="mb-2">Updating usage estimates...</p>}
          <p>
            All plans include basic support. Enterprise customers get dedicated
            account management.
          </p>
          <p className="mt-1">
            Need help choosing?{" "}
            <button
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
