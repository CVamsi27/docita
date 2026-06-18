"use client";

// jscpd:ignore-start
import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  Tooltip,
// jscpd:ignore-end
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/overlay/tooltip";
import {
  FEATURE_TIER_MAP,
  TIER_INFO,
  Tier,
  type Feature,
} from "@workspace/types";
import { getTierName } from "@workspace/utils";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";

export interface LockedFeatureCardProps {
  feature?: Feature;
  tier?: Tier;
  title?: string;
  description?: string;
}

export function LockedFeatureCard({
  feature,
  tier,
  title,
  description,
}: LockedFeatureCardProps) {
  const requiredTier = feature ? FEATURE_TIER_MAP[feature] : tier;
  const tierName =
    requiredTier !== undefined ? getTierName(requiredTier) : undefined;
  const tierInfo = tierName ? TIER_INFO[tierName] : undefined;

  return (
    <Card className="surface-warning border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <Lock className="h-5 w-5" />
          {title || "Feature Locked"}
        </CardTitle>
        <CardDescription className="text-warning/80">
          {description ||
            `This feature requires the ${tierInfo?.name || "higher"} plan or above.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="gap-2">
          <Link href={SUBSCRIPTION_SETTINGS_PATH}>
            <Sparkles className="h-4 w-4" />
            Upgrade to {tierInfo?.name || "unlock"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export interface FeatureTierBadgeProps {
  feature: Feature;
  className?: string;
}

const TIER_COLORS: Record<Tier, string> = {
  [Tier.STARTER]: "tier-capture",
  [Tier.ESSENTIAL]: "tier-core",
  [Tier.FRONT_DESK]: "tier-core",
  [Tier.FRONT_DESK_CLINIC]: "tier-core",
  [Tier.FRONT_DESK_HOSPITAL]: "tier-core",
  [Tier.PROFESSIONAL]: "tier-pro",
  [Tier.HOSPITAL]: "tier-hospital",
  [Tier.ENTERPRISE]: "tier-enterprise",
  [Tier.INTELLIGENCE]: "tier-intelligence",
};

export function FeatureTierBadge({
  feature,
  className,
}: FeatureTierBadgeProps) {
  const requiredTier = FEATURE_TIER_MAP[feature];
  const tierName = getTierName(requiredTier);
  const tierInfo = TIER_INFO[tierName];

  return (
    <Badge
      variant="outline"
      className={`${TIER_COLORS[requiredTier]} ${className ?? ""}`}
    >
      {tierInfo?.name || tierName}
    </Badge>
  );
}

export interface TierBadgeProps {
  tier?: Tier;
  className?: string;
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  if (tier === undefined || tier === null) return null;

  const tierName = getTierName(tier);
  const tierInfo = TIER_INFO[tierName];

  return (
    <Badge className={`${TIER_COLORS[tier]} ${className ?? ""}`}>
      {tierInfo?.name || tierName}
    </Badge>
  );
}

export function LockedFeatureIndicator({
  feature,
  className,
}: {
  feature: Feature;
  className?: string;
}) {
  const requiredTier = FEATURE_TIER_MAP[feature];
  const tierName = getTierName(requiredTier);
  void TIER_INFO[tierName];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Lock className={`h-4 w-4 text-warning ${className ?? ""}`} />
      </TooltipTrigger>
      <TooltipContent>
        <p>Locked</p>
      </TooltipContent>
    </Tooltip>
  );
}
