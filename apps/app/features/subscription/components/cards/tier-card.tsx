import {
  Badge,
  Card,
  CardContent
} from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import { Tier } from "@/lib/subscription/tier-access";
import { PlanFeatures } from "@/features/subscription/components/sections/plan-features";
import { Sparkles } from "lucide-react";
import {
  type TierCardProps,
  TIER_GRADIENTS,
} from "./tier-card-types";
import { TierCardHeader } from "./tier-card-header";
import { TierCardSelectButton } from "./tier-card-cta";

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
      {showTopAccent ? (
        <div className={cn("h-1.5 w-full", gradient.accent)} />
      ) : null}

      {isRecommended && !isCurrentTier ? (
        <Badge
          variant="default"
          className="absolute right-4 top-4 z-10 gap-1 rounded-full border border-primary/30 bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-primary-foreground shadow-sm"
        >
          <Sparkles className="h-3 w-3" aria-hidden />
          Recommended
        </Badge>
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
