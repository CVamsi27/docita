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

/**
 * FeatureGuard - guards content based on feature access
 *
 * Uses usePermissionStore to check if the user's current tier/add-ons
 * allow access to the specified feature.
 *
 * Following SOLID principles:
 * - Single Responsibility: Only handles feature gating
 * - Open/Closed: Extensible via props without modification
 * - Dependency Inversion: Depends on abstractions (usePermissionStore)
 */
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

/**
 * Default locked state card with upgrade CTA
 */
function FeatureLockedCard({
  feature,
  customTitle,
  customDescription,
}: FeatureLockedCardProps) {
  // Try to get tier info if feature is a known Feature enum value
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
    <Card className="relative overflow-hidden border-2 border-amber-300/50 bg-linear-to-br from-amber-50 via-amber-50/50 to-background dark:from-amber-950/30 dark:via-amber-900/20 dark:to-slate-900/50 dark:border-amber-700/30">
      <div className="absolute top-0 left-0 w-32 h-32 bg-amber-400/20 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 dark:bg-amber-500/10" />
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
          <Lock className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription className="text-amber-600/80 dark:text-amber-400/70">
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

/**
 * FeatureGuard Component
 *
 * Wraps content and only renders if the user can access the feature.
 * Shows fallback or locked card when access is denied.
 *
 * @param feature - Feature enum value or string identifier
 * @param children - Content to show when access is granted
 * @param fallback - Optional custom content when access denied
 * @param showLockCard - Show default locked card instead of hiding
 *
 * @example
 * ```tsx
 * <FeatureGuard feature={Feature.LAB_TESTS} showLockCard>
 *   <LabTestsPanel />
 * </FeatureGuard>
 * ```
 */
export function FeatureGuard({
  feature,
  children,
  fallback,
  showLockCard = false,
}: FeatureGuardProps) {
  const { canAccess } = usePermissionStore();

  // Check if feature is a known Feature enum, else treat as custom flag
  const featureEnum = Object.values(Feature).includes(feature as Feature)
    ? (feature as Feature)
    : null;

  const hasAccess = featureEnum ? canAccess(featureEnum) : true;

  if (hasAccess) {
    return <>{children}</>;
  }

  // Access denied - show appropriate UI
  if (fallback) {
    return <>{fallback}</>;
  }

  if (showLockCard) {
    return <FeatureLockedCard feature={feature} />;
  }

  // Default: hide the content
  return null;
}

/**
 * Hook to check feature access for conditional rendering
 *
 * @example
 * ```tsx
 * const canAccessLabTests = useCanAccessFeature(Feature.LAB_TESTS);
 * if (canAccessLabTests) {
 *   // show lab tests link
 * }
 * ```
 */
export function useCanAccessFeature(feature: Feature): boolean {
  const { canAccess } = usePermissionStore();
  return canAccess(feature);
}

/**
 * Hook to get feature lock status with tier info
 *
 * @returns { isLocked, requiredTier, tierInfo }
 */
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
