"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";

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
import { AlertTriangle, ArrowDown, ArrowRight, Building2, CheckCircle, Crown, Rocket, Sparkles, Zap } from "lucide-react";
import {
  PRICING_CURRENCY_CONFIG,
  type SupportedCurrency,
  Tier,
  TIER_INFO,
  type TierName,
  getUserFacingErrorMessage,
} from "@workspace/types";
import { type TierPricing, usePricingConfig } from "@/hooks/api/use-pricing";
import { useProrationPreview } from "@/hooks/api/use-billing";
import { formatCurrency, formatPriceWithCurrency } from "@workspace/utils";
import { SUBSCRIPTION_GST_INCLUSIVE_NOTICE } from "@/features/subscription/lib/billing-display-messages";

interface TierChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: Tier;
  selectedTier: TierName | null;
  billingCycle: "MONTHLY" | "YEARLY";
  currency: SupportedCurrency;
  onConfirm: () => Promise<void>;
  /** True while Razorpay or billing API is in flight (parent checkout hook). */
  checkoutInFlight?: boolean;
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
  currency,
  onConfirm,
  checkoutInFlight = false,
}: TierChangeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currencyConfig = PRICING_CURRENCY_CONFIG[currency];

  const { pricingConfig, isLoading: pricingLoading } =
    usePricingConfig(currency);

  const { data: prorationPreview, isFetching: prorationLoading } =
    useProrationPreview(selectedTier ?? "STARTER", billingCycle, {
      enabled: open && !!selectedTier && selectedTier !== "ENTERPRISE",
    });

  if (!selectedTier) return null;

  if (pricingLoading || !pricingConfig) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div
            className="flex items-center justify-center py-8"
            role="status"
            aria-live="polite"
            aria-label="Loading pricing"
          >
            <DocitaLoadingIndicator
              variant="section"
              withStatusRole={false}
              iconClassName="h-8 w-8"
            />
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

  const busy = isLoading || checkoutInFlight;

  const handleClose = () => {
    if (!busy) {
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
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background">
                    <CurrentIcon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">Current plan</span>
                </div>
                <p className="font-semibold">{currentInfo.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {!currentHasCustomPricing && typeof currentPrice === "number"
                    ? `${formatPrice(currentPrice)}${cycleSuffix}`
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

              <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-background text-primary">
                    <SelectedIcon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">Selected plan</span>
                </div>
                <p className="font-semibold">{selectedInfo.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {!selectedHasCustomPricing && typeof selectedPrice === "number"
                    ? `${formatPrice(selectedPrice)}${cycleSuffix}`
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
                    {formatPrice(Math.abs(priceDiff))}
                    {billingCycle === "YEARLY" ? "/year" : "/month"}
                  </span>
                </p>
              </div>
            )}

            {selectedTier !== "ENTERPRISE" && (prorationLoading || prorationPreview) && (
              <div className="rounded-lg border bg-muted/25 p-3 text-sm space-y-2">
                {prorationLoading ? (
                  <p className="text-muted-foreground">Calculating checkout amount…</p>
                ) : prorationPreview ? (
                  <>
                    {prorationPreview.creditCents > 0 ? (
                      <p className="text-muted-foreground">
                        Credit from unused period:{" "}
                        <span className="font-medium text-foreground">
                          {formatCurrency(prorationPreview.creditCents / 100, {
                            currency,
                            locale: currencyConfig.locale,
                            fractionDigits: currencyConfig.decimalPlaces,
                          })}
                        </span>
                      </p>
                    ) : null}
                    <p className="font-semibold">
                      Due today:{" "}
                      {formatCurrency(
                        prorationPreview.finalAmountCents / 100,
                        {
                          currency,
                          locale: currencyConfig.locale,
                          fractionDigits: currencyConfig.decimalPlaces,
                        },
                      )}
                    </p>
                  </>
                ) : null}
              </div>
            )}

            <p className="text-[var(--fs-2xs)] leading-snug text-muted-foreground">
              {SUBSCRIPTION_GST_INCLUSIVE_NOTICE}
            </p>

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

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={busy}
                className={cn(
                  isUpgrade ? "" : "btn-warning",
                )}
              >
                {busy ? (
                  <>
                    <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
                    Processing…
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
