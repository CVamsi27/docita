"use client";

// jscpd:ignore-start
import React from "react";
import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  Feature,
  FEATURE_TIER_MAP,
  Tier,
  TIER_INFO,
  coerceFeature,
} from "@workspace/types";
import { getTierName } from "@workspace/utils";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";

interface FeatureGuardProps {
// jscpd:ignore-end
  feature: Feature | string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLockCard?: boolean;
}

interface FeatureLockedCardProps {
  feature: Feature | string;
  customTitle?: string;
  customDescription?: string;
}

function FeatureLockedCard({
  feature,
  customTitle,
  customDescription,
}: FeatureLockedCardProps) {
  const featureEnum = coerceFeature(feature);

  const requiredTier = featureEnum ? FEATURE_TIER_MAP[featureEnum] : undefined;
  const tierName =
    requiredTier !== undefined ? getTierName(requiredTier) : undefined;
  const tierInfo = tierName ? TIER_INFO[tierName] : undefined;

  const title = customTitle || "Feature Locked";
  const description =
    customDescription ||
    (tierInfo
      ? `This feature requires the ${tierInfo.name} plan or higher.`
      : "Upgrade your plan to access this feature");

  return (
    <Card className="surface-warning border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-warning">
          <Lock className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription className="text-warning/80">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild size="sm" className="gap-2">
          <Link href={SUBSCRIPTION_SETTINGS_PATH}>
            <Sparkles className="h-4 w-4" />
            Upgrade Plan
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function FeatureGuard({
  feature,
  children,
  fallback,
  showLockCard = false,
}: FeatureGuardProps) {
  const { canAccess } = usePermissionStore();

  const featureEnum = coerceFeature(feature);

  const hasAccess = featureEnum ? canAccess(featureEnum) : true;

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showLockCard) {
    return <FeatureLockedCard feature={feature} />;
  }

  return null;
}

export function useCanAccessFeature(feature: Feature): boolean {
  const { canAccess } = usePermissionStore();
  return canAccess(feature);
}

export function useFeatureLockStatus(feature: Feature): {
  isLocked: boolean;
  requiredTier: Tier;
  tierInfo:
    | { name: string; description: string; tagline: string; color: string }
    | undefined;
} {
  const { canAccess } = usePermissionStore();
  const requiredTier = FEATURE_TIER_MAP[feature];
  const tierName = getTierName(requiredTier);
  const tierInfo = TIER_INFO[tierName];

  return {
    isLocked: !canAccess(feature),
    requiredTier,
    tierInfo,
  };
}

export type { FeatureGuardProps, FeatureLockedCardProps };
