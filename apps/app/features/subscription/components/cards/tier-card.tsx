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
import { PlanFeature, PlanFeatures } from "../sections/plan-features";
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
    card: "from-slate-50 to-slate-100/50 dark:from-slate-900/50 dark:to-slate-800/30",
    icon: "from-slate-500 to-slate-600",
    badge: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
  CORE: {
    card: "from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20",
    icon: "from-blue-500 to-blue-600",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  },
  PLUS: {
    card: "from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20",
    icon: "from-emerald-500 to-emerald-600",
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  },
  PRO: {
    card: "from-violet-50 to-purple-100/50 dark:from-violet-950/30 dark:to-purple-900/20",
    icon: "from-violet-500 to-purple-600",
    badge:
      "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
  },
  ENTERPRISE: {
    card: "from-amber-50 to-orange-100/50 dark:from-amber-950/30 dark:to-orange-900/20",
    icon: "from-amber-500 to-orange-600",
    badge:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  },
  INTELLIGENCE: {
    card: "from-pink-50 to-rose-100/50 dark:from-pink-950/30 dark:to-rose-900/20",
    icon: "from-pink-500 to-rose-600",
    badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
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
              "flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br shadow-md",
              gradient.icon,
            )}
          >
            <Icon className="h-5 w-5 text-white" />
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
