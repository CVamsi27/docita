import { CardDescription, CardHeader } from "@workspace/ui/components/indicators/card";
import { cn } from "@workspace/ui/lib/utils";
import { Tier } from "@/lib/subscription/tier-access";
import { Zap } from "lucide-react";
import { TIER_GRADIENTS, TIER_ICONS, type TierCardProps } from "./tier-card-types";
import { TierCardFullPricing, TierCardKeyHighlights, TierCardSummaryOverage, TierCardSummaryPricing } from "./tier-card-pricing";

export function TierCardHeader({
  tier,
  info,
  isCurrentTier,
  isSummary,
  pricing,
  billingCycle = "MONTHLY",
  currencySymbol,
  overageHint,
  overageItems,
  bestFor,
  keyHighlights,
  limitHighlights,
  usageHints,
}: Pick<
  TierCardProps,
  | "tier"
  | "info"
  | "pricing"
  | "billingCycle"
  | "currencySymbol"
  | "overageHint"
  | "overageItems"
  | "bestFor"
  | "keyHighlights"
  | "limitHighlights"
  | "usageHints"
> & {
  isCurrentTier: boolean;
  isSummary: boolean;
}) {
  const tierName = String(Tier[tier]);
  const Icon = TIER_ICONS[tierName] || Zap;
  const gradient = TIER_GRADIENTS[tierName] || TIER_GRADIENTS.STARTER;

  return (
    <CardHeader className={cn("pb-4 text-left", isSummary && "gap-0 pb-3")}>
      <div
        className={cn(
          "flex items-start gap-3",
          isCurrentTier ? "pr-24 sm:pr-28" : "pr-2",
        )}
      >
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border shadow-sm",
            gradient.icon,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="ui-section-title text-[var(--fs-xl)] leading-[var(--lh-tight)] text-foreground">
            {info.name}
          </h3>
          <CardDescription
            className={cn(
              "text-pretty font-medium leading-snug text-muted-foreground",
              isSummary ? "text-[var(--fs-xs)]" : "text-[var(--fs-sm)]",
            )}
          >
            {info.tagline}
          </CardDescription>
        </div>
      </div>

      {!isSummary ? (
        <p className="mt-4 min-h-12 text-sm leading-relaxed text-muted-foreground">
          {info.description}
        </p>
      ) : null}

      {pricing && isSummary ? (
        <TierCardSummaryPricing
          tier={tier}
          pricing={pricing}
          billingCycle={billingCycle}
          currencySymbol={currencySymbol}
          isCurrentTier={isCurrentTier}
        />
      ) : null}

      {keyHighlights?.length ? (
        <TierCardKeyHighlights highlights={keyHighlights} isSummary={isSummary} />
      ) : null}

      {!isSummary && bestFor ? (
        <p className="mt-3 rounded-md border border-border/70 bg-background/70 px-3 py-2 text-xs font-medium leading-relaxed text-foreground">
          {bestFor}
        </p>
      ) : null}

      {isSummary ? (
        <TierCardSummaryOverage overageHint={overageHint} overageItems={overageItems} />
      ) : null}

      {pricing && !isSummary ? (
        <TierCardFullPricing
          tier={tier}
          pricing={pricing}
          billingCycle={billingCycle}
          currencySymbol={currencySymbol}
          overageHint={overageHint}
          overageItems={overageItems}
          limitHighlights={limitHighlights}
          usageHints={usageHints}
        />
      ) : null}
    </CardHeader>
  );
}
