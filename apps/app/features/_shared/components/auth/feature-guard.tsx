"use client";

import React from "react";
import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Feature,
  FEATURE_TIER_MAP,
  Tier,
  TIER_INFO,
  TierName,
} from "@workspace/types";
import { usePermissionStore } from "@/lib/stores/permission-store";

interface FeatureGuardProps {
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

  const featureEnum = Object.values(Feature).includes(feature as Feature)
    ? (feature as Feature)
    : null;

  const requiredTier = featureEnum ? FEATURE_TIER_MAP[featureEnum] : undefined;
  const tierName =
    requiredTier !== undefined ? (Tier[requiredTier] as TierName) : undefined;
  const tierInfo = tierName ? TIER_INFO[tierName] : undefined;

  const title = customTitle || "Feature Locked";
  const description =
    customDescription ||
    (tierInfo
      ? `This feature requires the ${tierInfo.name} plan or higher.`
      : "Upgrade your plan to access this feature.");

  return (
    <Card className="surface-warning relative overflow-hidden border-2">
      <div className="absolute top-0 left-0 w-32 h-32 bg-warning/20 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
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
        <Button
          asChild
          size="sm"
          className="gap-2 bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
        >
          <Link href="/upgrade">
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

  const featureEnum = Object.values(Feature).includes(feature as Feature)
    ? (feature as Feature)
    : null;

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
  const tierName = Tier[requiredTier] as TierName;
  const tierInfo = TIER_INFO[tierName];

  return {
    isLocked: !canAccess(feature),
    requiredTier,
    tierInfo,
  };
}

export type { FeatureGuardProps, FeatureLockedCardProps };
