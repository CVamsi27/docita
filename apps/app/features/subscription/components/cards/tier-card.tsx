import {
  Card,
  CardContent,
} from "@workspace/ui/components/indicators/card";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { cn } from "@workspace/ui/lib/utils";
import { Tier } from "@/lib/tier-config";
import { PlanFeatures } from "@/features/subscription/components/sections/plan-features";
import {
  ArrowRight,
  CalendarDays,
  Check,
  Sparkles,
  Stethoscope,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { formatAmountLocale, formatCountLocale } from "@workspace/utils";
import { SUBSCRIPTION_GST_INCLUSIVE_NOTICE } from "@/features/subscription/lib/billing-display-messages";
import { YearlyVsListAnnualPrice } from "@/features/subscription/lib/yearly-vs-list-annual-price";
import {
  type TierCardProps,
  TIER_ICONS,
  TIER_GRADIENTS,
  LIMIT_ICONS,
  formatTierPrice,
} from "./tier-card-types";

export type { TierCardProps } from "./tier-card-types";

export function TierCard({
  tier,
  info,
  features,
  isCurrentTier,
  isLocked,
  className,
  currentTierValue,
  onSelect,
  pricing,
  billingCycle = "MONTHLY",
  currencySymbol,
  overageHint,
  overageItems,
  buttonLabel,
  maxDisplay = 5,
  usageHints,
  bestFor,
  includedLabel,
  limitHighlights,
  featureDisplay = "compact",
  showTopAccent = false,
  keyHighlights,
  density = "full",
  isRecommended = false,
}: TierCardProps & { currentTierValue?: Tier; onSelect?: () => void }) {
  const tierName = String(Tier[tier]);
  const gradient = TIER_GRADIENTS[tierName] || TIER_GRADIENTS.STARTER;
  const isSummary = density === "summary";

  return (
    <Card
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-lg border bg-card transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md",
        isSummary && "min-h-[26rem]",
        gradient.card,
        isCurrentTier && "border-primary ring-2 ring-primary/20 shadow-lg",
        isRecommended &&
          !isCurrentTier &&
          "border-primary/60 ring-1 ring-primary/15 shadow-md",
        !isCurrentTier && !isRecommended && "border-border/80 hover:border-primary/40",
        className,
      )}
    >
      {isRecommended && !isCurrentTier ? (
        <div className="flex items-center justify-center gap-1.5 bg-primary px-3 py-1 text-[var(--fs-2xs)] font-semibold uppercase tracking-wide text-primary-foreground">
          <Sparkles className="h-3 w-3" aria-hidden />
          Recommended for your usage
        </div>
      ) : showTopAccent ? (
        <div className={cn("h-1.5 w-full", gradient.accent)} />
      ) : null}

      {isCurrentTier ? (
        <Badge className="absolute right-4 top-4 z-10 bg-primary text-primary-foreground shadow-sm">
          Current plan
        </Badge>
      ) : null}

      <TierCardHeader
        tier={tier}
        info={info}
        isCurrentTier={isCurrentTier}
        isSummary={isSummary}
        pricing={pricing}
        billingCycle={billingCycle}
        currencySymbol={currencySymbol}
        overageHint={overageHint}
        overageItems={overageItems}
        bestFor={bestFor}
        keyHighlights={keyHighlights}
        limitHighlights={limitHighlights}
        usageHints={usageHints}
      />

      <CardContent className="flex-1 space-y-4 pt-0">
        {!isSummary && includedLabel ? (
          <div className="space-y-3 pt-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {includedLabel}
            </p>
          </div>
        ) : null}
        {!isSummary ? (
          <PlanFeatures
            features={features}
            maxDisplay={maxDisplay}
            align={featureDisplay === "compact" ? "center" : "left"}
            display={featureDisplay}
          />
        ) : null}
      </CardContent>

      {onSelect ? (
        <TierCardSelectButton
          tier={tier}
          currentTierValue={currentTierValue}
          isCurrentTier={isCurrentTier}
          isLocked={isLocked}
          buttonLabel={buttonLabel}
          onSelect={onSelect}
        />
      ) : null}
    </Card>
  );
}
