import { Link } from "react-router";
import { Clock, Lock, Sparkles } from "lucide-react";
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
  FEATURE_TIER_MAP,
  TIER_INFO,
  Tier,
  type Feature,
} from "@workspace/types";
import { getTierName, isFeatureGenerallyAvailable } from "@workspace/utils";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";

interface LockedFeatureCardProps {
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

  // A planned feature is locked for *every* tier, so an upgrade prompt is wrong
  // (a top-tier clinic would be told to "upgrade" to a plan it already exceeds).
  // Show a roadmap "coming soon" state instead of a paywall.
  const isComingSoon = feature ? !isFeatureGenerallyAvailable(feature) : false;

  if (isComingSoon) {
    return (
      <Card className="border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            {title || "Coming soon"}
          </CardTitle>
          <CardDescription>
            {description ||
              "This feature isn't available yet — it's on our roadmap and will be enabled for your plan when it ships."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="surface-warning border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-warning">
          <Lock className="h-5 w-5" />
          {title || "Feature Locked"}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {description ||
            `This feature requires the ${tierInfo?.name || "higher"} plan or above.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="gap-2">
          <Link to={SUBSCRIPTION_SETTINGS_PATH}>
            <Sparkles className="h-4 w-4" />
            Upgrade to {tierInfo?.name || "unlock"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

interface FeatureTierBadgeProps {
  feature: Feature;
  className?: string;
}

const TIER_COLORS: Record<Tier, string> = {
  [Tier.STARTER]: "tier-capture",
  [Tier.ESSENTIAL]: "tier-core",
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

interface TierBadgeProps {
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
