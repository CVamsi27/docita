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
import { Building2, Crown, Rocket, Sparkles, Zap } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

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
  buttonLabel?: string;
  maxDisplay?: number;
  usageHints?: { patients?: number; users?: number; whatsappMsgs?: number };
  bestFor?: string;
  includedLabel?: string;
  limitHighlights?: string[];
  featureDisplay?: "compact" | "detailed";
}

const TIER_ICONS: Record<string, React.ElementType> = {
  STARTER: Zap,
  ESSENTIAL: Rocket,
  PROFESSIONAL: Crown,
  ENTERPRISE: Building2,
  INTELLIGENCE: Sparkles,
};

const TIER_GRADIENTS: Record<
  string,
  { card: string; icon: string; badge: string }
> = {
  STARTER: {
    card: "from-background to-muted/40",
    icon: "tier-capture",
    badge: "tier-capture",
  },
  ESSENTIAL: {
    card: "from-background to-info/10",
    icon: "tier-core",
    badge: "tier-core",
  },
  PROFESSIONAL: {
    card: "from-background to-primary/10",
    icon: "tier-pro",
    badge: "tier-pro",
  },
  ENTERPRISE: {
    card: "from-background to-warning/10",
    icon: "tier-enterprise",
    badge: "tier-enterprise",
  },
  INTELLIGENCE: {
    card: "from-background to-accent",
    icon: "bg-accent text-accent-foreground",
    badge: "tier-intelligence",
  },
};

function formatTierPrice(
  tier: Tier,
  pricing: { monthly: number | "custom"; yearly: number | "custom" },
  billingCycle: "MONTHLY" | "YEARLY",
  sym = "₹",
): string {
  if (
    tier === Tier.ENTERPRISE ||
    pricing.monthly === "custom" ||
    pricing.yearly === "custom"
  ) {
    return "Custom";
  }
  if (tier === Tier.STARTER && pricing.monthly === 0 && pricing.yearly === 0) {
    return "Free forever";
  }
  if (billingCycle === "YEARLY" && typeof pricing.yearly === "number") {
    return `${sym}${pricing.yearly.toLocaleString()}/yr`;
  }
  if (typeof pricing.monthly === "number") {
    return `From ${sym}${pricing.monthly.toLocaleString()}/mo`;
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
  buttonLabel,
  maxDisplay = 5,
  usageHints,
  bestFor,
  includedLabel,
  limitHighlights,
  featureDisplay = "compact",
}: TierCardProps & { currentTierValue?: Tier; onSelect?: () => void }) {
  const tierName = Tier[tier] as string;
  const Icon = TIER_ICONS[tierName] || Zap;
  const gradient = TIER_GRADIENTS[tierName] || TIER_GRADIENTS.STARTER;

  const isUpgrade = currentTierValue !== undefined && tier > currentTierValue;
  const isDowngrade = currentTierValue !== undefined && tier < currentTierValue;

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col",
        "bg-linear-to-br border-2",
        gradient.card,
        isCurrentTier && "border-primary ring-2 ring-primary/20 shadow-lg",
        !isCurrentTier && "border-border hover:border-border",
        className,
      )}
    >
      {isCurrentTier && (
        <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground shadow-sm">
          Current
        </Badge>
      )}

      <CardHeader className="pb-4 text-left">
        <div className="flex items-start gap-3 pr-16">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl shadow-md",
              gradient.icon,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold leading-tight text-foreground">
              {info.name}
            </h3>
            <CardDescription className="text-xs">
              {info.tagline}
            </CardDescription>
          </div>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {info.description}
        </p>
        {bestFor && (
          <p className="mt-2 text-xs font-medium text-foreground">{bestFor}</p>
        )}
        {pricing && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-2xl font-semibold tracking-tight text-foreground">
              {formatTierPrice(tier, pricing, billingCycle, currencySymbol)}
            </p>
            <div className="space-y-1">
              {pricing.monthly !== 0 && pricing.monthly !== "custom" && (
                <p className="text-xs text-muted-foreground">Incl. 18% GST</p>
              )}
              {overageHint && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {overageHint}
                </p>
              )}
            </div>
            {(usageHints || limitHighlights?.length) && (
              <div className="flex flex-wrap gap-1.5">
                {usageHints?.patients !== undefined && (
                  <Badge variant="secondary" className="text-[var(--fs-2xs)]">
                    {usageHints.patients >= 999999
                      ? "Unlimited patients"
                      : `${usageHints.patients.toLocaleString()} patients`}
                  </Badge>
                )}
                {usageHints?.users !== undefined && (
                  <Badge variant="secondary" className="text-[var(--fs-2xs)]">
                    {usageHints.users >= 999
                      ? "Unlimited users"
                      : `Up to ${usageHints.users} users`}
                  </Badge>
                )}
                {usageHints?.whatsappMsgs !== undefined && (
                  <Badge variant="secondary" className="text-[var(--fs-2xs)]">
                    {usageHints.whatsappMsgs >= 999999
                      ? "Unlimited WA msgs"
                      : `${usageHints.whatsappMsgs.toLocaleString()} WA msgs/mo`}
                  </Badge>
                )}
                {limitHighlights?.map((item) => (
                  <Badge
                    key={item}
                    variant="secondary"
                    className="text-[var(--fs-2xs)]"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0 flex-1 space-y-3">
        {includedLabel && (
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {includedLabel}
          </p>
        )}
        <PlanFeatures
          features={features}
          maxDisplay={maxDisplay}
          align={featureDisplay === "compact" ? "center" : "left"}
          display={featureDisplay}
        />
      </CardContent>
      {onSelect && (
        <div className="p-4 pt-0 mt-auto">
          <Button
            className={cn(
              "w-full",
              isCurrentTier && "bg-muted text-muted-foreground",
              isUpgrade &&
                "bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-bold shadow-md shadow-primary/25",
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
          </Button>
        </div>
      )}
    </Card>
  );
}
