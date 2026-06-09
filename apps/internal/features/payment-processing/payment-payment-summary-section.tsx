import { Badge } from "@workspace/ui/components/indicators/badge";
import { DEFAULT_CURRENCY, formatCurrency } from "@workspace/utils";
import { getInternalTierBadgeClass } from "@/lib/tier-display";
import type { PaymentProcessingPageViewModel } from "@/features/payment-processing/use-payment-processing-page";

type PaymentSummarySectionProps = Pick<PaymentProcessingPageViewModel, 'selectedClinic' | 'tierInfo' | 'selectedTierPricing'>;

export function PaymentSummarySection({ selectedClinic, tierInfo, selectedTierPricing }: PaymentSummarySectionProps) {
  if (!tierInfo) return null;
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Current Tier</p>
        <Badge className={getInternalTierBadgeClass(tierInfo.currentTier)}>
          {tierInfo.currentTier}
        </Badge>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">Current Price</p>
        <p className="text-lg font-semibold">
          {formatCurrency(
            selectedTierPricing.find((t) => t.tier === tierInfo.currentTier)?.price ?? tierInfo.pricing,
            { currency: selectedClinic?.currency || DEFAULT_CURRENCY, fractionDigits: 0 },
          )}
        </p>
      </div>
    </div>
  );
}
