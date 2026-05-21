import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/indicators/card";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { cn } from "@workspace/ui/lib/utils";
import { Tier } from "@/lib/subscription/tier-access";
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
import { Button } from "@workspace/ui/components/form/button";
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
  const Icon = TIER_ICONS[tierName] || Zap;
  const gradient = TIER_GRADIENTS[tierName] || TIER_GRADIENTS.STARTER;
  const isSummary = density === "summary";

  const isUpgrade = currentTierValue !== undefined && tier > currentTierValue;
  const isDowngrade = currentTierValue !== undefined && tier < currentTierValue;

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
      {isCurrentTier && (
        <Badge className="absolute right-4 top-4 z-10 bg-primary text-primary-foreground shadow-sm">
          Current plan
        </Badge>
      )}

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
                isSummary
                  ? "text-[var(--fs-xs)]"
                  : "text-[var(--fs-sm)]",
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
        {/* Price block — flat, no nested box, with savings inline */}
        {pricing && isSummary && (
          <div className="mt-5 space-y-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-[var(--fs-3xl)] font-semibold leading-none tabular-nums text-foreground">
                {billingCycle === "YEARLY" &&
                typeof pricing.monthly === "number" &&
                typeof pricing.yearly === "number" &&
                tier !== Tier.ENTERPRISE ? (
                  <YearlyVsListAnnualPrice
                    monthlyListPrice={pricing.monthly}
                    discountedAnnualPrice={pricing.yearly}
                    formatMoney={(amount) =>
                      `${currencySymbol ?? ""}${formatAmountLocale(amount)}`
                    }
                  />
                ) : (
                  formatTierPrice(tier, pricing, billingCycle, currencySymbol)
                )}
              </p>
              {!isCurrentTier &&
                billingCycle === "YEARLY" &&
                typeof pricing.monthly === "number" &&
                typeof pricing.yearly === "number" &&
                pricing.monthly > 0 &&
                pricing.monthly * 12 > pricing.yearly && (
                  <span className="shrink-0 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[var(--fs-2xs)] font-semibold tabular-nums text-success">
                    Save {currencySymbol ?? ""}
                    {formatAmountLocale(
                      pricing.monthly * 12 - pricing.yearly,
                    )}
                  </span>
                )}
            </div>
            {pricing.monthly !== 0 && pricing.monthly !== "custom" && (
              <p className="text-[var(--fs-2xs)] leading-snug text-muted-foreground">
                {SUBSCRIPTION_GST_INCLUSIVE_NOTICE}
              </p>
            )}
          </div>
        )}
        {/* Highlights — sit between price and overage, divider above */}
        {keyHighlights?.length ? (
          <ul
            className={cn(
              "space-y-2 border-t border-border/60",
              isSummary ? "mt-5 pt-4" : "mt-3 pt-3",
            )}
            aria-label="Plan highlights"
          >
            {keyHighlights.slice(0, isSummary ? 4 : 5).map((line) => (
              <li
                key={line}
                className={cn(
                  "flex gap-2 leading-snug text-foreground",
                  isSummary
                    ? "text-[var(--fs-xs)]"
                    : "text-[var(--fs-xs)]",
                )}
              >
                <Check
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
                  aria-hidden
                />
                <span className="text-pretty">{line}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {!isSummary && bestFor ? (
          <p className="mt-3 rounded-md border border-border/70 bg-background/70 px-3 py-2 text-xs font-medium leading-relaxed text-foreground">
            {bestFor}
          </p>
        ) : null}
        {/* Overage rates — quiet caption row, no nested box */}
        {isSummary && (overageItems?.length || overageHint) ? (
          <div className="mt-4 border-t border-border/60 pt-3">
            <p className="text-[var(--fs-2xs)] font-semibold uppercase tracking-wide text-muted-foreground">
              Beyond included usage
            </p>
            {overageItems?.length ? (
              <p className="mt-1.5 text-[var(--fs-xs)] leading-relaxed text-muted-foreground">
                {overageItems.join(" · ")}
              </p>
            ) : overageHint ? (
              <p className="mt-1.5 text-[var(--fs-xs)] leading-relaxed text-muted-foreground">
                {overageHint}
              </p>
            ) : null}
          </div>
        ) : null}
        {/* Non-summary mode: keep the original boxed price layout */}
        {pricing && !isSummary && (
          <div className="mt-5 space-y-4">
            <div className="rounded-lg border border-border/70 bg-background/80 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[var(--fs-3xl)] font-semibold leading-[var(--lh-tight)] tabular-nums text-foreground">
                  {billingCycle === "YEARLY" &&
                  typeof pricing.monthly === "number" &&
                  typeof pricing.yearly === "number" &&
                  tier !== Tier.ENTERPRISE ? (
                    <YearlyVsListAnnualPrice
                      monthlyListPrice={pricing.monthly}
                      discountedAnnualPrice={pricing.yearly}
                      formatMoney={(amount) =>
                        `${currencySymbol ?? ""}${formatAmountLocale(amount)}`
                      }
                    />
                  ) : (
                    formatTierPrice(tier, pricing, billingCycle, currencySymbol)
                  )}
                </p>
              </div>
              {pricing.monthly !== 0 && pricing.monthly !== "custom" && (
                <p className="mt-1 text-[var(--fs-2xs)] leading-snug text-muted-foreground">
                  {SUBSCRIPTION_GST_INCLUSIVE_NOTICE}
                </p>
              )}
              {overageItems?.length || overageHint ? (
                <div className="mt-3 border-t border-border/70 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Additional usage
                  </p>
                  {overageItems?.length ? (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {overageItems.map((item) => (
                        <li
                          key={item}
                          className="rounded-md border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground"
                        >
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      {overageHint}
                    </p>
                  )}
                </div>
              ) : null}
            </div>

            {limitHighlights?.length ? (
              <ul className="grid grid-cols-2 gap-2 text-sm text-foreground">
                {limitHighlights.map((item, index) => {
                  const LimitIcon = LIMIT_ICONS[index] ?? Check;

                  return (
                    <li
                      key={item}
                      className="flex min-h-12 items-center gap-2 rounded-md border border-border/70 bg-background/70 px-3 py-2 leading-tight"
                    >
                      <LimitIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span>{item}</span>
                    </li>
                  );
                })}
              </ul>
            ) : !isSummary && usageHints ? (
              <ul className="grid grid-cols-1 gap-2 text-sm text-foreground">
                {usageHints.patients !== undefined && (
                  <li className="flex min-h-12 items-center gap-2 rounded-md border border-border/70 bg-background/70 px-3 py-2 leading-tight">
                    <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>
                      {usageHints.patients >= 999999
                        ? "Unlimited patients"
                        : `${formatCountLocale(usageHints.patients)} patients`}
                    </span>
                  </li>
                )}
                {usageHints.users !== undefined && (
                  <li className="flex min-h-12 items-center gap-2 rounded-md border border-border/70 bg-background/70 px-3 py-2 leading-tight">
                    <Stethoscope className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>
                      {usageHints.users >= 999
                        ? "Unlimited users"
                        : `Up to ${usageHints.users} users`}
                    </span>
                  </li>
                )}
                {usageHints.whatsappMsgs !== undefined && (
                  <li className="flex min-h-12 items-center gap-2 rounded-md border border-border/70 bg-background/70 px-3 py-2 leading-tight">
                    <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span>
                      {usageHints.whatsappMsgs >= 999999
                        ? "Unlimited WA msgs"
                        : `${formatCountLocale(usageHints.whatsappMsgs)} WA msgs/mo`}
                    </span>
                  </li>
                )}
              </ul>
            ) : null}
          </div>
        )}
      </CardHeader>
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
      {onSelect && (
        <div className="mt-auto border-t border-border/70 bg-background/70 p-4">
          <Button
            className={cn(
              "h-11 w-full gap-2",
              isCurrentTier && "bg-muted text-muted-foreground",
              isUpgrade &&
                "bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20 hover:bg-primary/90",
              isDowngrade &&
                "bg-muted/50 text-muted-foreground border-muted hover:bg-muted/70",
            )}
            variant={isDowngrade ? "outline" : "default"}
            disabled={isCurrentTier || isLocked}
            onClick={onSelect}
          >
            {buttonLabel
              ? buttonLabel
              : isLocked
                ? "Locked"
                : isCurrentTier
                  ? "Current Plan"
                  : isUpgrade
                    ? "Upgrade"
                    : isDowngrade
                      ? "Downgrade"
                      : "Select Plan"}
            {!isCurrentTier && !isLocked && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      )}
    </Card>
  );
}
