import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import { Tier, TierInfo } from "@/lib/tier-config";
import {
  PlanFeature,
  PlanFeatures,
} from "@/features/subscription/components/sections/plan-features";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  ClipboardList,
  Crown,
  HardDrive,
  Hospital,
  Rocket,
  Sparkles,
  Stethoscope,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { formatAmountLocale, formatCountLocale } from "@workspace/utils";
import { SUBSCRIPTION_GST_INCLUSIVE_NOTICE } from "@/features/subscription/lib/billing-display-messages";
import { YearlyVsListAnnualPrice } from "@/features/subscription/lib/yearly-vs-list-annual-price";

interface TierCardProps {
  tier: Tier;
  info: TierInfo;
  features: PlanFeature[];
  isCurrentTier: boolean;
  isLocked: boolean;
  className?: string;
  pricing?: { monthly: number | "custom"; yearly: number | "custom" };
  billingCycle?: "MONTHLY" | "YEARLY";
  currencySymbol?: string;
  overageHint?: string;
  overageItems?: string[];
  buttonLabel?: string;
  maxDisplay?: number;
  usageHints?: { patients?: number; users?: number; whatsappMsgs?: number };
  bestFor?: string;
  includedLabel?: string;
  limitHighlights?: string[];
  featureDisplay?: "compact" | "detailed";
  /** Accent stripe at top of card (plans grid usually omits this). */
  showTopAccent?: boolean;
  /**
   * Short bullets shown under the description (e.g. onboarding plan picker).
   * Distinct from the full `features` list rendered by `PlanFeatures`.
   */
  keyHighlights?: string[];
  /**
   * `summary`: name, tagline, price, CTA only — for surfaces that already show a full comparison (e.g. Compare Plans tab).
   * `full`: default rich plan card.
   */
  density?: "full" | "summary";
}

const TIER_ICONS: Record<string, React.ElementType> = {
  STARTER: Zap,
  ESSENTIAL: Rocket,
  FRONT_DESK: ClipboardList,
  PROFESSIONAL: Crown,
  HOSPITAL: Hospital,
  ENTERPRISE: Building2,
  INTELLIGENCE: Sparkles,
};

const TIER_GRADIENTS: Record<
  string,
  { card: string; icon: string; badge: string; accent: string }
> = {
  STARTER: {
    card: "from-card via-card to-muted/35",
    icon: "tier-capture",
    badge: "tier-capture",
    accent: "bg-muted-foreground",
  },
  ESSENTIAL: {
    card: "from-card via-card to-info/10",
    icon: "tier-core",
    badge: "tier-core",
    accent: "bg-info",
  },
  FRONT_DESK: {
    card: "from-card via-card to-info/10",
    icon: "tier-core",
    badge: "tier-core",
    accent: "bg-info",
  },
  PROFESSIONAL: {
    card: "from-card via-card to-primary/10",
    icon: "tier-pro",
    badge: "tier-pro",
    accent: "bg-primary",
  },
  HOSPITAL: {
    card: "from-card via-card to-info/10",
    icon: "tier-hospital",
    badge: "tier-hospital",
    accent: "bg-info",
  },
  ENTERPRISE: {
    card: "from-card via-card to-warning/10",
    icon: "tier-enterprise",
    badge: "tier-enterprise",
    accent: "bg-warning",
  },
  INTELLIGENCE: {
    card: "from-card via-card to-accent",
    icon: "bg-accent text-accent-foreground",
    badge: "tier-intelligence",
    accent: "bg-accent-foreground",
  },
};

const LIMIT_ICONS = [Users, Stethoscope, CalendarDays, HardDrive];

function formatTierPrice(
  tier: Tier,
  pricing: { monthly: number | "custom"; yearly: number | "custom" },
  billingCycle: "MONTHLY" | "YEARLY",
  sym = "",
): string {
  if (
    tier === Tier.ENTERPRISE ||
    pricing.monthly === "custom" ||
    pricing.yearly === "custom"
  ) {
    return "Custom";
  }
  if (billingCycle === "YEARLY" && typeof pricing.yearly === "number") {
    return `${sym}${formatAmountLocale(pricing.yearly)}/yr`;
  }
  if (typeof pricing.monthly === "number") {
    return `From ${sym}${formatAmountLocale(pricing.monthly)}/mo`;
  }
  return "Custom";
}

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
}: TierCardProps & { currentTierValue?: Tier; onSelect?: () => void }) {
  const tierName = Tier[tier] as string;
  const Icon = TIER_ICONS[tierName] || Zap;
  const gradient = TIER_GRADIENTS[tierName] || TIER_GRADIENTS.STARTER;
  const isSummary = density === "summary";

  const isUpgrade = currentTierValue !== undefined && tier > currentTierValue;
  const isDowngrade = currentTierValue !== undefined && tier < currentTierValue;

  return (
    <Card
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-colors duration-150 hover:shadow-md",
        gradient.card,
        isCurrentTier && "border-primary ring-2 ring-primary/20 shadow-lg",
        !isCurrentTier && "border-border/80 hover:border-primary/40",
        className,
      )}
    >
      {showTopAccent ? (
        <div className={cn("h-1.5 w-full", gradient.accent)} />
      ) : null}
      {isCurrentTier && (
        <Badge className="absolute right-4 top-4 bg-primary text-primary-foreground shadow-sm">
          Current Plan
        </Badge>
      )}
      {!isCurrentTier &&
        billingCycle === "YEARLY" &&
        pricing &&
        typeof pricing.monthly === "number" &&
        typeof pricing.yearly === "number" &&
        pricing.monthly > 0 &&
        pricing.monthly * 12 > pricing.yearly && (
          <Badge
            variant="outline"
            className="absolute right-4 top-4 border-success/40 bg-success/10 text-success shadow-sm"
          >
            Save {currencySymbol ?? ""}
            {formatAmountLocale(pricing.monthly * 12 - pricing.yearly)}/yr
          </Badge>
        )}

      <CardHeader className={cn("pb-4 text-left", isSummary && "pb-3")}>
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
        {keyHighlights?.length ? (
          <ul
            className={cn(
              "space-y-1.5 border-t border-border/60",
              isSummary
                ? "mt-2 pt-2"
                : "mt-3 pt-3",
            )}
            aria-label="Plan highlights"
          >
            {keyHighlights.slice(0, isSummary ? 4 : 5).map((line) => (
              <li
                key={line}
                className={cn(
                  "flex gap-2 leading-snug text-foreground",
                  isSummary
                    ? "text-[var(--fs-2xs)]"
                    : "text-[var(--fs-xs)]",
                )}
              >
                <Check
                  className={cn(
                    "mt-0.5 shrink-0 text-primary",
                    isSummary ? "h-3 w-3" : "h-3.5 w-3.5",
                  )}
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
        {pricing && (
          <div className={cn("space-y-4", isSummary ? "mt-4" : "mt-5")}>
            <div className="rounded-lg border border-border/70 bg-background/80 p-4 shadow-sm">
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
              {pricing.monthly !== 0 && pricing.monthly !== "custom" && (
                <p className="mt-1 text-[var(--fs-2xs)] leading-snug text-muted-foreground">
                  {SUBSCRIPTION_GST_INCLUSIVE_NOTICE}
                </p>
              )}
              {overageItems?.length || overageHint ? (
                <div
                  className={cn(
                    "mt-3 border-t border-border/70 pt-3",
                    isSummary && "pt-2.5",
                  )}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Additional usage
                  </p>
                  {overageItems?.length ? (
                    <ul
                      className={cn(
                        "mt-2 flex flex-wrap gap-1.5",
                        isSummary && "gap-1",
                      )}
                    >
                      {overageItems.map((item) => (
                        <li
                          key={item}
                          className={cn(
                            "rounded-md border border-border/70 bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground",
                            isSummary && "px-2 py-0.5 text-[var(--fs-2xs)]",
                          )}
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

            {!isSummary && limitHighlights?.length ? (
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
