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
  getUserFacingErrorMessage,
} from "@workspace/types";
import { type TierPricing, usePricingConfig } from "@/hooks/api/use-pricing";

interface TierChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: Tier;
  selectedTier: TierName | null;
  billingCycle: "MONTHLY" | "YEARLY";
  onConfirm: () => Promise<void>;
}

const TIER_ICONS: Record<TierName, React.ElementType> = {
  STARTER: Zap,
  ESSENTIAL: Rocket,
  PROFESSIONAL: Crown,
  ENTERPRISE: Building2,
  INTELLIGENCE: Sparkles,
};

export function TierChangeDialog({
  open,
  onOpenChange,
  currentTier,
  selectedTier,
  billingCycle,
  onConfirm,
}: TierChangeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currency: SupportedCurrency = "INR";
  const currencyConfig = PRICING_CURRENCY_CONFIG[currency];

  const { pricingConfig, isLoading: pricingLoading } =
    usePricingConfig(currency);

  if (!selectedTier) return null;

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

  const currentTierData = pricingConfig.tiers.find(
    (t: TierPricing) => t.id === currentTierName,
  );
  const selectedTierData = pricingConfig.tiers.find(
    (t: TierPricing) => t.id === selectedTier,
  );
  const currentPrice = currentTierData?.pricing?.monthly ?? 0;
  const selectedPrice = selectedTierData?.pricing?.monthly ?? 0;
  const currentHasCustomPricing =
    currentTierName === "ENTERPRISE" || currentPrice === "custom";
  const selectedHasCustomPricing =
    selectedTier === "ENTERPRISE" || selectedPrice === "custom";

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
    !currentHasCustomPricing &&
    !selectedHasCustomPricing &&
    typeof currentPrice === "number" &&
    typeof selectedPrice === "number"
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
      setError(
        getUserFacingErrorMessage(err, {
          fallback: "We could not change your plan right now. Please try again.",
          context: "payment",
        }),
      );
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {isUpgrade ? (
              <>
                <ArrowRight className="h-5 w-5 text-primary" />
                Confirm plan change
              </>
            ) : (
              <>
                <ArrowDown className="h-5 w-5 text-warning" />
                Confirm plan change
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Review the plan, billing cycle, and monthly price before checkout.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 mx-auto">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Plan Updated!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your facility is now on the {selectedInfo.name} plan.
              </p>
            </div>
            <Button onClick={handleClose} className="mt-4">
              Done
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 py-2 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch">
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background">
                    <CurrentIcon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">Current plan</span>
                </div>
                <p className="font-semibold">{currentInfo.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {!currentHasCustomPricing && typeof currentPrice === "number"
                    ? `${formatPrice(currentPrice)}/mo`
                    : "Custom pricing"}
                </p>
              </div>

              <div className="hidden items-center justify-center sm:flex">
                {isUpgrade ? (
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ArrowDown className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background text-primary">
                    <SelectedIcon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">Selected plan</span>
                </div>
                <p className="font-semibold">{selectedInfo.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {!selectedHasCustomPricing && typeof selectedPrice === "number"
                    ? `${formatPrice(selectedPrice)}/mo`
                    : "Custom pricing"}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {billingCycle === "YEARLY" ? "Yearly billing" : "Monthly billing"}
                </p>
              </div>
            </div>

            {priceDiff !== null && priceDiff !== 0 && (
              <div
                className={cn(
                  "text-center py-3 px-4 rounded-lg",
                  isUpgrade
                    ? "bg-success/10"
                    : "bg-warning/10",
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

            {isDowngrade && (
              <Alert className="surface-warning">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning-foreground">
                  Downgrading will limit your access to certain features. Your
                  data will be preserved, but you may not be able to access all
                  of it until you upgrade again.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert className="surface-danger">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {selectedTier === "ENTERPRISE" && (
              <Alert className="surface-info">
                <Building2 className="h-4 w-4 text-info" />
                <AlertDescription className="text-info">
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
                  isUpgrade ? "" : "btn-warning",
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
