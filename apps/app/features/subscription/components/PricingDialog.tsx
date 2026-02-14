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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Switch } from "@workspace/ui/components/switch";
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";
import { Building2, Check, Crown, Rocket, Sparkles, Zap } from "lucide-react";
import {
  PRICING_CURRENCY_CONFIG,
  type SupportedCurrency,
  Tier,
  TIER_INFO,
  TIER_LIMITS,
  type TierName,
} from "@workspace/types";
import { type TierPricing, usePricingConfig } from "@/hooks/api/use-pricing";

interface PricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: Tier;
  onSelectTier: (tier: TierName, cycle: "MONTHLY" | "YEARLY") => void;
}

const TIER_ICONS: Record<TierName, React.ElementType> = {
  CAPTURE: Zap,
  CORE: Rocket,
  PLUS: Sparkles,
  PRO: Crown,
  ENTERPRISE: Building2,
  INTELLIGENCE: Sparkles,
};

const TIER_GRADIENTS: Record<TierName, string> = {
  CAPTURE: "from-slate-500/20 to-slate-600/10",
  CORE: "from-blue-500/20 to-blue-600/10",
  PLUS: "from-emerald-500/20 to-emerald-600/10",
  PRO: "from-violet-500/20 to-purple-600/10",
  ENTERPRISE: "from-amber-500/20 to-orange-600/10",
  INTELLIGENCE: "from-pink-500/20 to-rose-600/10",
};

const TIER_BORDER_COLORS: Record<TierName, string> = {
  CAPTURE: "border-slate-500/30 hover:border-slate-400/50",
  CORE: "border-blue-500/30 hover:border-blue-400/50",
  PLUS: "border-emerald-500/30 hover:border-emerald-400/50",
  PRO: "border-violet-500/30 hover:border-violet-400/50",
  ENTERPRISE: "border-amber-500/30 hover:border-amber-400/50",
  INTELLIGENCE: "border-pink-500/30 hover:border-pink-400/50",
};

export function PricingDialog({
  open,
  onOpenChange,
  currentTier,
  onSelectTier,
}: PricingDialogProps) {
  const [currency, setCurrency] = useState<SupportedCurrency>("INR");
  const [isYearly, setIsYearly] = useState(false);

  // Fetch pricing from backend
  const { pricingConfig } = usePricingConfig(currency);

  const tiers: TierName[] = ["CAPTURE", "CORE", "PLUS", "PRO", "ENTERPRISE"];
  const currencyConfig = PRICING_CURRENCY_CONFIG[currency];

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

  // Get tier pricing from backend data
  const getTierPricing = (tierName: TierName) => {
    const tierData = pricingConfig?.tiers.find(
      (t: TierPricing) => t.id === tierName,
    );
    return tierData?.pricing ?? { monthly: 0, yearly: 0 };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-linear-to-br from-background via-background to-muted/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800/50">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-bold bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
            Choose Your Plan
          </DialogTitle>
          <DialogDescription>
            Select the plan that best fits your clinic&apos;s needs
          </DialogDescription>
        </DialogHeader>
        {/* Currency and Billing Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Label htmlFor="currency" className="text-sm font-medium">
              Currency:
            </Label>
            <Select
              value={currency}
              onValueChange={(v) => setCurrency(v as SupportedCurrency)}
            >
              <SelectTrigger className="w-32 bg-background/50 backdrop-blur-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PRICING_CURRENCY_CONFIG).map(([code, cfg]) => (
                  <SelectItem key={code} value={code}>
                    {cfg.symbol} {code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                Save {pricingConfig?.discounts?.annualPercent ?? 10}%
              </Badge>
            )}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 py-4">
          {tiers.map((tierName, index) => {
              const info = TIER_INFO[tierName];
              const tierPricing = getTierPricing(tierName);
              const limits = TIER_LIMITS[tierName];
              const Icon = TIER_ICONS[tierName];
              const tierNumeric = getTierNumeric(tierName);
              const isCurrentTier = tierNumeric === currentTier;
              const isUpgrade = tierNumeric > currentTier;
              const isDowngrade = tierNumeric < currentTier;

              const price = isYearly ? tierPricing.yearly : tierPricing.monthly;
              const monthlyEquivalent =
                isYearly && typeof price === "number" ? price / 12 : price;

              return (
                <div
                  key={tierName}
                  style={{ animationDelay: `${index * 50}ms` }}
                  className={cn(
                    "relative flex flex-col rounded-xl border-2 p-4",
                    "bg-linear-to-br backdrop-blur-sm",
                    "transition-all duration-300 ease-out",
                    "hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-4",
                    TIER_GRADIENTS[tierName],
                    TIER_BORDER_COLORS[tierName],
                    isCurrentTier &&
                      "ring-2 ring-primary ring-offset-2 ring-offset-background",
                  )}
                >
                  {isCurrentTier && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground z-10">
                      Current
                    </Badge>
                  )}

                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg",
                        "bg-linear-to-br",
                        tierName === "CAPTURE" && "from-slate-500 to-slate-600",
                        tierName === "CORE" && "from-blue-500 to-blue-600",
                        tierName === "PLUS" &&
                          "from-emerald-500 to-emerald-600",
                        tierName === "PRO" && "from-violet-500 to-purple-600",
                        tierName === "ENTERPRISE" &&
                          "from-amber-500 to-orange-600",
                      )}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{info.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {info.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Price */}
                  <div
                    key={isYearly ? "yearly" : "monthly"}
                    className="mb-4 animate-in fade-in slide-in-from-left-2 duration-200"
                  >
                    {price === "custom" ? (
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

                  {/* Key Limits */}
                  <div className="space-y-2 mb-4 flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500" />
                      <span>
                        {limits.patients === 999999
                          ? "Unlimited"
                          : limits.patients.toLocaleString()}{" "}
                        patients
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500" />
                      <span>
                        {limits.doctors === 999 ? "Unlimited" : limits.doctors}{" "}
                        doctor
                        {limits.doctors !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500" />
                      <span>{limits.storageGB} GB storage</span>
                    </div>
                    {limits.appointments && (
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-500" />
                        <span>
                          {limits.appointments === 999999
                            ? "Unlimited"
                            : limits.appointments.toLocaleString()}{" "}
                          appointments/mo
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
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
        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border/50">
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
              Contact our sales team
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
