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
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Building2,
  CheckCircle,
  ClipboardList,
  Crown,
  Hospital,
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
  getTierName,
  getUserFacingErrorMessage,
} from "@workspace/types";
import { type TierPricing, usePricingConfig } from "@/hooks/api/use-pricing";
import { useProrationPreview } from "@/hooks/api/use-billing";
import { formatCurrency, formatPriceWithCurrency } from "@workspace/utils";
import { SUBSCRIPTION_GST_INCLUSIVE_NOTICE } from "@/features/subscription/lib/billing-display-messages";
import { YearlyVsListAnnualPrice } from "@/features/subscription/lib/yearly-vs-list-annual-price";
import { getTierFeatureDelta } from "@/features/subscription/lib/feature-delta";
import { Check, Minus, CalendarClock } from "lucide-react";

interface TierChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTier: Tier;
  selectedTier: TierName | null;
  billingCycle: "MONTHLY" | "YEARLY";
  currency: SupportedCurrency;
  onConfirm: () => Promise<void>;
  /** Schedule the downgrade for current-period-end (no charge today). */
  onSchedule?: () => Promise<void>;
  /** ISO timestamp of the current period end (renewal anchor for scheduled). */
  currentPeriodEnd?: string | null;
  /** True while Razorpay or billing API is in flight (parent checkout hook). */
  checkoutInFlight?: boolean;
}

const TIER_ICONS: Record<TierName, React.ElementType> = {
  STARTER: Zap,
  ESSENTIAL: Rocket,
  FRONT_DESK: ClipboardList,
  PROFESSIONAL: Crown,
  HOSPITAL: Hospital,
  ENTERPRISE: Building2,
  INTELLIGENCE: Sparkles,
};

const PLAN_TIER_RANK: Record<TierName, number> = {
  STARTER: 10,
  FRONT_DESK: 18,
  ESSENTIAL: 20,
  PROFESSIONAL: 30,
  HOSPITAL: 35,
  ENTERPRISE: 40,
  INTELLIGENCE: 36,
};

export function TierChangeDialog({
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
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // For downgrades, default to "apply at next renewal" — keeps current-tier
  // features for the rest of the paid period.
  const [timing, setTiming] = useState<"now" | "at-renewal">("at-renewal");

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

  const currentTierName = getTierName(currentTier);
  const currentInfo = TIER_INFO[currentTierName];
  const selectedInfo = TIER_INFO[selectedTier];
  const currentRank = PLAN_TIER_RANK[currentTierName] ?? 0;
  const selectedRank = PLAN_TIER_RANK[selectedTier] ?? 0;

  const isUpgrade = selectedRank > currentRank;
  const isDowngrade = selectedRank < currentRank;

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
      if (isDowngrade && timing === "at-renewal" && onSchedule) {
        await onSchedule();
      } else {
        await onConfirm();
      }
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

  const featureDelta = getTierFeatureDelta(currentTierName, selectedTier);
  const formattedRenewalDate = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

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
                  {billingCycle === "YEARLY" &&
                  !currentHasCustomPricing &&
                  currentTierData &&
                  typeof currentTierData.pricing.monthly === "number" &&
                  typeof currentPrice === "number" ? (
                    <YearlyVsListAnnualPrice
                      monthlyListPrice={currentTierData.pricing.monthly}
                      discountedAnnualPrice={currentPrice}
                      formatMoney={formatPrice}
                    />
                  ) : !currentHasCustomPricing && typeof currentPrice === "number" ? (
                    `${formatPrice(currentPrice)}${cycleSuffix}`
                  ) : (
                    "Custom pricing"
                  )}
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
                  {billingCycle === "YEARLY" &&
                  !selectedHasCustomPricing &&
                  selectedTierData &&
                  typeof selectedTierData.pricing.monthly === "number" &&
                  typeof selectedPrice === "number" ? (
                    <YearlyVsListAnnualPrice
                      monthlyListPrice={selectedTierData.pricing.monthly}
                      discountedAnnualPrice={selectedPrice}
                      formatMoney={formatPrice}
                    />
                  ) : !selectedHasCustomPricing &&
                    typeof selectedPrice === "number" ? (
                    `${formatPrice(selectedPrice)}${cycleSuffix}`
                  ) : (
                    "Custom pricing"
                  )}
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

            {/* Feature delta — concrete view of what changes. */}
            {(featureDelta.gained.length > 0 || featureDelta.lost.length > 0) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {featureDelta.gained.length > 0 ? (
                  <div className="rounded-lg border border-success/40 bg-success/5 p-3">
                    <p className="mb-2 text-[var(--fs-2xs)] font-semibold uppercase tracking-wide text-success">
                      You&apos;ll gain
                    </p>
                    <ul className="space-y-1 text-sm">
                      {featureDelta.gained.slice(0, 6).map((f) => (
                        <li
                          key={f.feature}
                          className="flex items-start gap-2 leading-snug"
                        >
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                          <span>{f.name}</span>
                        </li>
                      ))}
                      {featureDelta.gained.length > 6 ? (
                        <li className="pl-5 text-xs text-muted-foreground">
                          + {featureDelta.gained.length - 6} more
                        </li>
                      ) : null}
                    </ul>
                  </div>
                ) : null}
                {featureDelta.lost.length > 0 ? (
                  <div className="rounded-lg border border-warning/40 bg-warning/5 p-3">
                    <p className="mb-2 text-[var(--fs-2xs)] font-semibold uppercase tracking-wide text-warning">
                      You&apos;ll lose
                    </p>
                    <ul className="space-y-1 text-sm">
                      {featureDelta.lost.slice(0, 6).map((f) => (
                        <li
                          key={f.feature}
                          className="flex items-start gap-2 leading-snug"
                        >
                          <Minus
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning"
                            aria-hidden
                          />
                          <span>{f.name}</span>
                        </li>
                      ))}
                      {featureDelta.lost.length > 6 ? (
                        <li className="pl-5 text-xs text-muted-foreground">
                          + {featureDelta.lost.length - 6} more
                        </li>
                      ) : null}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}

            {/* Timing chooser — only for downgrades when scheduling is wired. */}
            {isDowngrade && onSchedule ? (
              <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                <p className="text-[var(--fs-2xs)] font-semibold uppercase tracking-wide text-muted-foreground">
                  When should this take effect?
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setTiming("at-renewal")}
                    className={cn(
                      "flex flex-col gap-1 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                      timing === "at-renewal"
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:bg-muted/40",
                    )}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <CalendarClock className="h-4 w-4 shrink-0" aria-hidden />
                      At next renewal{formattedRenewalDate ? ` (${formattedRenewalDate})` : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Keep {currentInfo.name} features for the rest of the paid
                      period. No charge today.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTiming("now")}
                    className={cn(
                      "flex flex-col gap-1 rounded-md border px-3 py-2 text-left text-sm transition-colors",
                      timing === "now"
                        ? "border-warning bg-warning/5 ring-1 ring-warning/30"
                        : "border-border hover:bg-muted/40",
                    )}
                  >
                    <span className="font-medium">Apply immediately</span>
                    <span className="text-xs text-muted-foreground">
                      Lose higher-tier features now. Unused time becomes account
                      credit toward your next invoice.
                    </span>
                  </button>
                </div>
              </div>
            ) : null}

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
