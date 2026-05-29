"use client";

import React from "react";
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
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/overlay/tooltip";
import {
  Feature,
  FEATURE_TIER_MAP,
  Tier,
  TIER_INFO,
} from "@workspace/types";
import { getTierName } from "@workspace/utils";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";

export { Feature, Tier };

interface FeatureGateProps {
  feature: Feature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLockedCard?: boolean;
}

interface TierGateProps {
  tier: Tier;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLockedCard?: boolean;
}

interface FeatureTierBadgeProps {
  feature: Feature;
  className?: string;
}

interface TierBadgeProps {
  tier?: Tier;
  className?: string;
}

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
        <Button
          asChild
          className="gap-2"
        >
          <Link href={SUBSCRIPTION_SETTINGS_PATH}>
            <Sparkles className="h-4 w-4" />
            Upgrade to {tierInfo?.name || "unlock"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showLockedCard = false,
}: FeatureGateProps) {
  const { canAccess } = usePermissionStore();
  const hasAccess = canAccess(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showLockedCard) {
    return <LockedFeatureCard feature={feature} />;
  }

  return null;
}

export function FeatureTierBadge({
  feature,
  className,
}: FeatureTierBadgeProps) {
  const requiredTier = FEATURE_TIER_MAP[feature];
  const tierName = getTierName(requiredTier);
  const tierInfo = TIER_INFO[tierName];

  const tierColors: Record<Tier, string> = {
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

  return (
    <Badge
      variant="outline"
      className={`${tierColors[requiredTier]} ${className ?? ""}`}
    >
      {tierInfo?.name || tierName}
    </Badge>
  );
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  if (tier === undefined || tier === null) return null;

  const tierColors: Record<Tier, string> = {
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

  const tierName = getTierName(tier);
  const tierInfo = TIER_INFO[tierName];

  return (
    <Badge className={`${tierColors[tier]} ${className ?? ""}`}>
      {tierInfo?.name || tierName}
    </Badge>
  );
}

export function TierGate({
  tier,
  children,
  fallback,
  showLockedCard = false,
}: TierGateProps) {
  const canAccess = usePermissionStore((state) => state.canAccess);
  const tierFeature = {
    [Tier.STARTER]: Feature.BASIC_PATIENT_MANAGEMENT,
    [Tier.ESSENTIAL]: Feature.INVOICING,
    [Tier.PROFESSIONAL]: Feature.WHATSAPP_OWN_NUMBER,
    [Tier.HOSPITAL]: Feature.WHATSAPP_MANAGED_NUMBER,
    [Tier.ENTERPRISE]: Feature.DATA_WAREHOUSE_EXPORT,
    [Tier.INTELLIGENCE]: Feature.AI_PRESCRIPTION_ASSISTANT,
    [Tier.FRONT_DESK]: Feature.CALENDAR_SLOTS,
    [Tier.FRONT_DESK_CLINIC]: Feature.CALENDAR_SLOTS,
    [Tier.FRONT_DESK_HOSPITAL]: Feature.CALENDAR_SLOTS,
  }[tier];
  const hasAccess = canAccess(
    tierFeature ?? Feature.BASIC_PATIENT_MANAGEMENT,
  );

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showLockedCard) {
    return <LockedFeatureCard tier={tier} />;
  }

  return null;
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
        <Lock
          className={`h-4 w-4 text-warning ${className ?? ""}`}
        />
      </TooltipTrigger>
      <TooltipContent>
        <p>Locked</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function useFeature(feature: Feature): boolean {
  const { canAccess } = usePermissionStore();
  return canAccess(feature);
}

export function useTier(): Tier {
  const { currentTier } = usePermissionStore();
  return currentTier;
}

export function useIsFeatureLocked(feature: Feature): boolean {
  const { isFeatureLocked } = usePermissionStore();
  return isFeatureLocked(feature);
}

export function useRequiredTier(feature: Feature): Tier {
  return FEATURE_TIER_MAP[feature];
}

export type {
  FeatureGateProps,
  TierGateProps,
  FeatureTierBadgeProps,
  TierBadgeProps,
  LockedFeatureCardProps,
};
