"use client";

import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  DEFAULT_CURRENCY,
  formatBillingCycleLabel,
  formatCurrency,
  formatInternalTierCardPrice,
  formatPlanLimitCount,
} from "@workspace/utils";
import { TrendingUp } from "lucide-react";
import type { PaymentProcessingPageViewModel } from "@/features/payment-processing/use-payment-processing-page";

type PaymentProcessingTierPricingSectionProps = Pick<
  PaymentProcessingPageViewModel,
  "tierPricing"
>;

export function PaymentProcessingTierPricingSection({
  tierPricing,
}: PaymentProcessingTierPricingSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {tierPricing && tierPricing.length > 0 ? (
        tierPricing.map((tier) => (
          <Card key={tier.tier}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">
                {tier.displayName ?? tier.tier}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                  {formatInternalTierCardPrice(
                    tier.tier,
                    tier.priceIsCustom ? null : tier.price,
                    (amount) =>
                      formatCurrency(amount, {
                        currency: DEFAULT_CURRENCY,
                        fractionDigits: 0,
                      }),
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatBillingCycleLabel(tier.billingCycle)}
                </p>
                <div className="space-y-1 pt-2 border-t">
                  <p className="text-xs">
                    <strong>{formatPlanLimitCount(tier.maxDoctors)}</strong> doctors
                  </p>
                  <p className="text-xs">
                    <strong>{formatPlanLimitCount(tier.maxPatients)}</strong>{" "}
                    patients
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="col-span-full">
          <EmptyState
            icon={TrendingUp}
            title="No tier pricing information available"
            description="Pricing tiers will appear here once billing configuration is available."
          />
        </div>
      )}
    </div>
  );
}
