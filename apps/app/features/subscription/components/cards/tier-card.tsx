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
}

const TIER_ICONS: Record<string, React.ElementType> = {
  CAPTURE: Zap,
  CORE: Rocket,
  PLUS: Sparkles,
  PRO: Crown,
  ENTERPRISE: Building2,
  INTELLIGENCE: Sparkles,
};

const TIER_GRADIENTS: Record<
  string,
  { card: string; icon: string; badge: string }
> = {
  CAPTURE: {
    card: "from-background to-muted/40",
    icon: "tier-capture",
    badge: "tier-capture",
  },
  CORE: {
    card: "from-background to-info/10",
    icon: "tier-core",
    badge: "tier-core",
  },
  PLUS: {
    card: "from-background to-success/10",
    icon: "tier-plus",
    badge: "tier-plus",
  },
  PRO: {
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

export function TierCard({
  tier,
  info,
  features,
  isCurrentTier,
  isLocked,
  className,
  currentTierValue,
  onSelect,
}: TierCardProps & { currentTierValue?: Tier; onSelect?: () => void }) {
  const tierName = Tier[tier] as string;
  const Icon = TIER_ICONS[tierName] || Zap;
  const gradient = TIER_GRADIENTS[tierName] || TIER_GRADIENTS.CAPTURE;

  const isUpgrade = currentTierValue !== undefined && tier > currentTierValue;
  const isDowngrade = currentTierValue !== undefined && tier < currentTierValue;

  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg flex flex-col",
        "bg-linear-to-br border-2",
        gradient.card,
        isCurrentTier && "border-primary ring-2 ring-primary/20 shadow-lg",
        isLocked && "opacity-60 border-muted",
        !isCurrentTier && !isLocked && "border-border/50 hover:border-border",
        className,
      )}
    >
      {isCurrentTier && (
        <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground shadow-sm">
          Current
        </Badge>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl shadow-md",
              gradient.icon,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">{info.name}</CardTitle>
            <CardDescription className="text-xs">
              {info.tagline}
            </CardDescription>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{info.description}</p>
      </CardHeader>
      <CardContent className="pt-0 flex-1">
        <PlanFeatures features={features} maxDisplay={5} />
      </CardContent>
      {onSelect && (
        <div className="p-4 pt-0 mt-auto">
          <Button
            className={cn(
              "w-full",
              isCurrentTier && "bg-muted text-muted-foreground",
              isUpgrade &&
                "bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
              isDowngrade && "bg-background hover:bg-muted border-primary/20",
            )}
            variant={isDowngrade ? "outline" : "default"}
            disabled={isCurrentTier}
            onClick={onSelect}
          >
            {isCurrentTier
              ? "Current Plan"
              : isUpgrade
                ? "Upgrade"
                : "Downgrade"}
          </Button>
        </div>
      )}
    </Card>
  );
}
