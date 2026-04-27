import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import { Tier, TierInfo } from "@/lib/tier-config";
import { PlanFeature, PlanFeatures } from "@/features/subscription/components/sections/plan-features";
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
}: TierCardProps & { currentTierValue?: Tier; onSelect?: () => void }) {
  const tierName = Tier[tier] as string;
  const Icon = TIER_ICONS[tierName] || Zap;
  const gradient = TIER_GRADIENTS[tierName] || TIER_GRADIENTS.STARTER;
  const isEnterprise = tierName === "ENTERPRISE";

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

      <CardHeader className={cn("pb-3", isEnterprise && "text-center")}>
        <div
          className={cn(
            "flex items-center gap-3",
            isEnterprise && "flex-col items-center",
          )}
        >
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl shadow-md",
              gradient.icon,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className={cn(isEnterprise && "flex flex-col items-center")}>
            <CardTitle className="text-base">{info.name}</CardTitle>
            <CardDescription className="text-xs">
              {info.tagline}
            </CardDescription>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{info.description}</p>
        {pricing && (
          <div className={cn("mt-2", isEnterprise && "flex flex-col items-center")}>
            <p className={cn("text-sm font-semibold text-foreground", isEnterprise && "text-center")}>
              {formatTierPrice(tier, pricing, billingCycle, currencySymbol)}
            </p>
            {pricing.monthly !== 0 && pricing.monthly !== "custom" && (
              <p className="text-xs text-muted-foreground">Incl. 18% GST</p>
            )}
            {overageHint && (
              <p className={cn("text-xs text-muted-foreground", isEnterprise && "text-center")}>
                {overageHint}
              </p>
            )}
            {usageHints && (
              <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                {usageHints.patients !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {usageHints.patients >= 999999
                      ? "Unlimited patients"
                      : `${usageHints.patients.toLocaleString()} patients`}
                  </span>
                )}
                {usageHints.users !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {usageHints.users >= 999
                      ? "Unlimited users"
                      : `Up to ${usageHints.users} users`}
                  </span>
                )}
                {usageHints.whatsappMsgs !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    {usageHints.whatsappMsgs >= 999999
                      ? "Unlimited WA msgs"
                      : `${usageHints.whatsappMsgs.toLocaleString()} WA msgs/mo`}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0 flex-1">
        <PlanFeatures features={features} maxDisplay={maxDisplay} />
      </CardContent>
      {onSelect && (
        <div className="p-4 pt-0 mt-auto">
          <Button
            className={cn(
              "w-full",
              isCurrentTier && "bg-muted text-muted-foreground",
              isUpgrade &&
                "bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-bold shadow-md shadow-primary/25",
              isDowngrade && "bg-muted/50 text-muted-foreground border-muted hover:bg-muted/70",
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
