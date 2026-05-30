"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { Button } from "@workspace/ui/components/form/button";
import { Alert, AlertDescription } from "@workspace/ui/components/feedback/alert";
import { cn } from "@workspace/ui/lib/utils";
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Building2,
  CheckCircle,
} from "lucide-react";
import { SUBSCRIPTION_GST_INCLUSIVE_NOTICE } from "@/features/subscription/lib/billing-display-messages";
import {
  type TierChangeDialogProps,
} from "./tier-change-dialog-types";
import {
  FeatureDeltaGrid,
  DowngradeTimingChooser,
  ProrationPreview,
} from "./tier-change-dialog-sections";
import { TierChangeDialogPlanCompare } from "./tier-change-dialog-plan-compare";
import { useTierChangeDialog } from "./use-tier-change-dialog";

export type { TierChangeDialogProps } from "./tier-change-dialog-types";

export function TierChangeDialog(props: TierChangeDialogProps) {
  const { selectedTier, billingCycle, onSchedule } = props;
  const dialog = useTierChangeDialog(props);

  if (!selectedTier) return null;

  if (dialog.pricingLoading || !dialog.pricingConfig) {
    return (
      <Dialog open={props.open} onOpenChange={props.onOpenChange}>
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

  return (
    <Dialog open={props.open} onOpenChange={dialog.handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {dialog.isUpgrade ? (
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

        {dialog.success ? (
          <div className="py-8 text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/15 mx-auto">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Plan Updated!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your facility is now on the {dialog.selectedInfo?.name} plan.
              </p>
            </div>
            <Button onClick={dialog.handleClose} className="mt-4">
              Done
            </Button>
          </div>
        ) : (
          <>
            <TierChangeDialogPlanCompare
              currentTierName={dialog.currentTierName}
              selectedTier={selectedTier}
              billingCycle={billingCycle}
              isUpgrade={dialog.isUpgrade}
              currentTierData={dialog.currentTierData}
              selectedTierData={dialog.selectedTierData}
              currentPrice={dialog.currentPrice}
              selectedPrice={dialog.selectedPrice}
              currentHasCustomPricing={dialog.currentHasCustomPricing}
              selectedHasCustomPricing={dialog.selectedHasCustomPricing}
              formatPrice={dialog.formatPrice}
              cycleSuffix={dialog.cycleSuffix}
            />

            {dialog.priceDiff !== null && dialog.priceDiff !== 0 ? (
              <div
                className={cn(
                  "text-center py-3 px-4 rounded-lg",
                  dialog.isUpgrade ? "bg-success/10" : "bg-warning/10",
                )}
              >
                <p className="text-sm">
                  {dialog.isUpgrade ? "Additional cost: " : "You'll save: "}
                  <span className="font-semibold">
                    {dialog.formatPrice(Math.abs(dialog.priceDiff))}
                    {billingCycle === "YEARLY" ? "/year" : "/month"}
                  </span>
                </p>
              </div>
            ) : null}

            <FeatureDeltaGrid
              gained={dialog.featureDelta.gained}
              lost={dialog.featureDelta.lost}
            />

            {dialog.isDowngrade && onSchedule ? (
              <DowngradeTimingChooser
                timing={dialog.timing}
                onTimingChange={dialog.setTiming}
                currentPlanName={dialog.currentInfo.name}
                formattedRenewalDate={dialog.formattedRenewalDate}
              />
            ) : null}

            {selectedTier !== "ENTERPRISE" ? (
              <ProrationPreview
                prorationLoading={dialog.prorationLoading}
                prorationPreview={dialog.prorationPreview}
                currency={props.currency}
                currencyConfig={dialog.currencyConfig}
              />
            ) : null}

            <p className="text-[var(--fs-2xs)] leading-snug text-muted-foreground">
              {SUBSCRIPTION_GST_INCLUSIVE_NOTICE}
            </p>

            {dialog.isDowngrade ? (
              <Alert className="surface-warning">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning-foreground">
                  Downgrading will limit your access to certain features. Your
                  data will be preserved, but you may not be able to access all
                  of it until you upgrade again.
                </AlertDescription>
              </Alert>
            ) : null}

            {dialog.error ? (
              <Alert className="surface-danger">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">
                  {dialog.error}
                </AlertDescription>
              </Alert>
            ) : null}

            {selectedTier === "ENTERPRISE" ? (
              <Alert className="surface-info">
                <Building2 className="h-4 w-4 text-info" />
                <AlertDescription className="text-info">
                  Enterprise plans require a sales consultation. Click confirm
                  to request a callback from our team.
                </AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={dialog.handleClose}
                disabled={dialog.busy}
              >
                Cancel
              </Button>
              <Button
                variant={dialog.isUpgrade ? "default" : "warning"}
                onClick={dialog.handleConfirm}
                disabled={dialog.busy}
              >
                {dialog.busy ? (
                  <>
                    <DocitaLoadingIndicator
                      variant="inline"
                      decorative
                      className="mr-2"
                    />
                    Processing…
                  </>
                ) : selectedTier === "ENTERPRISE" ? (
                  "Request Callback"
                ) : (
                  `Confirm ${dialog.isUpgrade ? "Upgrade" : "Downgrade"}`
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
