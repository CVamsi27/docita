"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Alert, AlertDescription } from "@workspace/ui/components/alert";
import { cn } from "@workspace/ui/lib/utils";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Building2,
  CheckCircle,
  Crown,
  Loader2,
  Rocket,
  Sparkles,
  Zap,
} from "lucide-react";
import {
  PRICING_CURRENCY_CONFIG,
  type SupportedCurrency,
  Tier,
  TIER_INFO,
  type TierName,
} from "@workspace/types";
import { type TierPricing, usePricingConfig } from "@/hooks/api/use-pricing";

interface TierChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: Tier;
  selectedTier: TierName | null;
  onConfirm: () => Promise<void>;
}

const TIER_ICONS: Record<TierName, React.ElementType> = {
  CAPTURE: Zap,
  CORE: Rocket,
  PLUS: Sparkles,
  PRO: Crown,
  ENTERPRISE: Building2,
  INTELLIGENCE: Sparkles,
};

export function TierChangeDialog({
  open,
  onOpenChange,
  currentTier,
  selectedTier,
  onConfirm,
}: TierChangeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency: SupportedCurrency = "INR"; // Could be from user preferences
  const currencyConfig = PRICING_CURRENCY_CONFIG[currency];

  // Fetch pricing from backend
  const { pricingConfig, isLoading: pricingLoading } =
    usePricingConfig(currency);

  if (!selectedTier) return null;

  // Show loading while fetching pricing
  if (pricingLoading || !pricingConfig) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const currentTierName = Tier[currentTier] as TierName;
  const currentInfo = TIER_INFO[currentTierName];
  const selectedInfo = TIER_INFO[selectedTier];
  const selectedTierNumeric = Tier[selectedTier as keyof typeof Tier];

  const isUpgrade = selectedTierNumeric > currentTier;
  const isDowngrade = selectedTierNumeric < currentTier;

  // Get pricing from backend response
  const currentTierData = pricingConfig.tiers.find(
    (t: TierPricing) => t.id === currentTierName,
  );
  const selectedTierData = pricingConfig.tiers.find(
    (t: TierPricing) => t.id === selectedTier,
  );
  const currentPrice = currentTierData?.pricing?.monthly ?? 0;
  const selectedPrice = selectedTierData?.pricing?.monthly ?? 0;

  const formatPrice = (price: number | "custom") => {
    if (price === "custom") return "Custom";
    return new Intl.NumberFormat(currencyConfig.locale, {
      style: "currency",
      currency: currency,
      minimumFractionDigits: currencyConfig.decimalPlaces,
      maximumFractionDigits: currencyConfig.decimalPlaces,
    }).format(price);
  };

  const priceDiff =
    typeof currentPrice === "number" && typeof selectedPrice === "number"
      ? selectedPrice - currentPrice
      : null;

  const CurrentIcon = TIER_ICONS[currentTierName];
  const SelectedIcon = TIER_ICONS[selectedTier];

  const handleConfirm = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await onConfirm();
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change tier");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setSuccess(false);
      setError(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-linear-to-br from-background via-background to-muted/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isUpgrade ? (
              <>
                <ArrowRight className="h-5 w-5 text-emerald-500" />
                Upgrade Your Plan
              </>
            ) : (
              <>
                <ArrowDown className="h-5 w-5 text-amber-500" />
                Downgrade Plan
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isUpgrade
              ? "Unlock more features for your clinic"
              : "You'll lose access to some features"}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mx-auto">
              <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Plan Updated!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your clinic is now on the {selectedInfo.name} plan.
              </p>
            </div>
            <Button onClick={handleClose} className="mt-4">
              Done
            </Button>
          </div>
        ) : (
          <>
            {/* Plan Comparison */}
            <div className="flex items-center justify-center gap-4 py-6">
              {/* Current Plan */}
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 dark:bg-slate-800/50 min-w-[120px]">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted dark:bg-slate-700">
                  <CurrentIcon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">{currentInfo.name}</span>
                <span className="text-xs text-muted-foreground">
                  {typeof currentPrice === "number"
                    ? `${formatPrice(currentPrice)}/mo`
                    : "Custom"}
                </span>
              </div>

              {/* Arrow */}
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  isUpgrade
                    ? "bg-emerald-100 dark:bg-emerald-900/30"
                    : "bg-amber-100 dark:bg-amber-900/30",
                )}
              >
                {isUpgrade ? (
                  <ArrowRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <ArrowDown className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                )}
              </div>

              {/* New Plan */}
              <div
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-lg min-w-[120px]",
                  isUpgrade
                    ? "bg-emerald-50 dark:bg-emerald-900/20 ring-2 ring-emerald-500/30"
                    : "bg-amber-50 dark:bg-amber-900/20 ring-2 ring-amber-500/30",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    isUpgrade
                      ? "bg-emerald-100 dark:bg-emerald-800"
                      : "bg-amber-100 dark:bg-amber-800",
                  )}
                >
                  <SelectedIcon
                    className={cn(
                      "h-5 w-5",
                      isUpgrade
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400",
                    )}
                  />
                </div>
                <span className="text-sm font-medium">{selectedInfo.name}</span>
                <span className="text-xs text-muted-foreground">
                  {typeof selectedPrice === "number"
                    ? `${formatPrice(selectedPrice)}/mo`
                    : "Custom"}
                </span>
              </div>
            </div>

            {/* Price Difference */}
            {priceDiff !== null && priceDiff !== 0 && (
              <div
                className={cn(
                  "text-center py-3 px-4 rounded-lg",
                  isUpgrade
                    ? "bg-emerald-50 dark:bg-emerald-900/20"
                    : "bg-amber-50 dark:bg-amber-900/20",
                )}
              >
                <p className="text-sm">
                  {isUpgrade ? "Additional cost: " : "You'll save: "}
                  <span className="font-semibold">
                    {formatPrice(Math.abs(priceDiff))}/month
                  </span>
                </p>
              </div>
            )}

            {/* Downgrade Warning */}
            {isDowngrade && (
              <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 dark:text-amber-200">
                  Downgrading will limit your access to certain features. Your
                  data will be preserved, but you may not be able to access all
                  of it until you upgrade again.
                </AlertDescription>
              </Alert>
            )}

            {/* Error */}
            {error && (
              <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-600">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {/* Enterprise Notice */}
            {selectedTier === "ENTERPRISE" && (
              <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
                <Building2 className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  Enterprise plans require a sales consultation. Click confirm
                  to request a callback from our team.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isLoading}
                className={cn(
                  isUpgrade
                    ? "bg-linear-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400"
                    : "bg-amber-600 hover:bg-amber-500",
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : selectedTier === "ENTERPRISE" ? (
                  "Request Callback"
                ) : (
                  `Confirm ${isUpgrade ? "Upgrade" : "Downgrade"}`
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
