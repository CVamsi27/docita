"use client";

import React from "react";
import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import {
  Feature,
  FEATURE_TIER_MAP,
  Tier,
  TIER_INFO,
  TierName,
} from "@workspace/types";
import { usePermissionStore } from "@/lib/stores/permission-store";

// Re-export for convenience
export { Feature, Tier };

// Type definitions
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

/**
 * Locked Feature Card - displays when a feature is not available
 * Shows the required tier and upgrade prompt
 */
export function LockedFeatureCard({
  feature,
  tier,
  title,
  description,
}: LockedFeatureCardProps) {
  const requiredTier = feature ? FEATURE_TIER_MAP[feature] : tier;
  const tierName =
    requiredTier !== undefined ? (Tier[requiredTier] as TierName) : undefined;
  const tierInfo = tierName ? TIER_INFO[tierName] : undefined;

  return (
    <Card className="relative overflow-hidden border-2 border-amber-300/50 bg-linear-to-br from-amber-50 via-amber-50/50 to-background dark:from-amber-950/30 dark:via-amber-900/20 dark:to-slate-900/50 dark:border-amber-700/30">
      <div className="absolute top-0 left-0 w-32 h-32 bg-amber-400/20 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 dark:bg-amber-500/10" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Lock className="h-5 w-5" />
          {title || "Feature Locked"}
        </CardTitle>
        <CardDescription className="text-amber-600/80 dark:text-amber-400/70">
          {description ||
            `This feature requires the ${tierInfo?.name || "higher"} plan or above.`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          asChild
          className="gap-2 bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
        >
          <Link href="/upgrade">
            <Sparkles className="h-4 w-4" />
            Upgrade to {tierInfo?.name || "unlock"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * Feature Gate - allows access based on feature availability
 * Uses permission store to check if user can access the feature
 */
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

  // Show locked UI
  if (fallback) {
    return <>{fallback}</>;
  }

  if (showLockedCard) {
    return <LockedFeatureCard feature={feature} />;
  }

  return null;
}

/**
 * Feature Tier Badge - shows which tier a feature requires
 * Displays the actual tier name from FEATURE_TIER_MAP
 */
export function FeatureTierBadge({
  feature,
  className,
}: FeatureTierBadgeProps) {
  const requiredTier = FEATURE_TIER_MAP[feature];
  const tierName = Tier[requiredTier] as TierName;
  const tierInfo = TIER_INFO[tierName];

  const tierColors: Record<Tier, string> = {
    [Tier.CAPTURE]: "bg-gray-100 text-gray-700 border-gray-300",
    [Tier.CORE]: "bg-blue-100 text-blue-700 border-blue-300",
    [Tier.PLUS]: "bg-green-100 text-green-700 border-green-300",
    [Tier.PRO]: "bg-purple-100 text-purple-700 border-purple-300",
    [Tier.ENTERPRISE]: "bg-amber-100 text-amber-700 border-amber-300",
    [Tier.INTELLIGENCE]: "bg-cyan-100 text-cyan-700 border-cyan-300",
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

/**
 * Tier Badge - shows current subscription tier
 */
export function TierBadge({ tier, className }: TierBadgeProps) {
  if (tier === undefined || tier === null) return null;

  const tierColors: Record<Tier, string> = {
    [Tier.CAPTURE]: "bg-gray-100 text-gray-700",
    [Tier.CORE]: "bg-blue-100 text-blue-700",
    [Tier.PLUS]: "bg-green-100 text-green-700",
    [Tier.PRO]: "bg-purple-100 text-purple-700",
    [Tier.ENTERPRISE]: "bg-amber-100 text-amber-700",
    [Tier.INTELLIGENCE]: "bg-cyan-100 text-cyan-700",
  };

  const tierName = Tier[tier] as TierName;
  const tierInfo = TIER_INFO[tierName];

  return (
    <Badge className={`${tierColors[tier]} ${className ?? ""}`}>
      {tierInfo?.name || tierName}
    </Badge>
  );
}

/**
 * Tier Gate - allows access based on subscription tier
 * Uses permission store to check if user has required tier
 */
export function TierGate({
  tier,
  children,
  fallback,
  showLockedCard = false,
}: TierGateProps) {
  const { canAccessTier } = usePermissionStore();
  const hasAccess = canAccessTier(tier);

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

/**
 * Locked Feature Indicator - shows a lock icon with tooltip for locked items
 * Use in navigation/lists to indicate locked status
 */
export function LockedFeatureIndicator({
  feature,
  className,
}: {
  feature: Feature;
  className?: string;
}) {
  const requiredTier = FEATURE_TIER_MAP[feature];
  const tierName = Tier[requiredTier] as TierName;
  const tierInfo = TIER_INFO[tierName];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Lock
            className={`h-4 w-4 text-amber-500 dark:text-amber-400 ${className ?? ""}`}
          />
        </TooltipTrigger>
        <TooltipContent>
          <p>Requires {tierInfo?.name || tierName} plan</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Hook to check if a feature is enabled
 * Uses permission store for real access check
 */
export function useFeature(feature: Feature): boolean {
  const { canAccess } = usePermissionStore();
  return canAccess(feature);
}

/**
 * Hook to get current subscription tier
 * Returns actual tier from permission store
 */
export function useTier(): Tier {
  const { currentTier } = usePermissionStore();
  return currentTier;
}

/**
 * Hook to check if a feature is locked
 * Returns true if user cannot access the feature
 */
export function useIsFeatureLocked(feature: Feature): boolean {
  const { isFeatureLocked } = usePermissionStore();
  return isFeatureLocked(feature);
}

/**
 * Hook to get required tier for a feature
 */
export function useRequiredTier(feature: Feature): Tier {
  return FEATURE_TIER_MAP[feature];
}

// Export types
export type {
  FeatureGateProps,
  TierGateProps,
  FeatureTierBadgeProps,
  TierBadgeProps,
  LockedFeatureCardProps,
};
