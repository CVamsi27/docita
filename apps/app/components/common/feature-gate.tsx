"use client";

import React from "react";
import { usePermissionStore } from "@/lib/stores/permission-store";
import {
  Feature,
  Tier,
  getTierInfo,
  FEATURE_TIER_MAP,
} from "@/lib/tier-config";
import { Lock, Sparkles, ArrowUpRight } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

// Re-export Feature and Tier for convenience
export { Feature, Tier } from "@/lib/tier-config";

interface FeatureGateProps {
  feature: Feature;
  children: React.ReactNode;
  /** What to show when feature is locked. Defaults to upgrade prompt */
  fallback?: React.ReactNode;
  /** Show children but in disabled/preview state */
  showPreview?: boolean;
  /** Custom class for the wrapper */
  className?: string;
}

/**
 * Component that conditionally renders children based on feature access
 *
 * @example
 * <FeatureGate feature={Feature.MULTI_DOCTOR}>
 *   <MultiDoctorSettings />
 * </FeatureGate>
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  showPreview = false,
  className,
}: FeatureGateProps) {
  const { canAccess } = usePermissionStore();

  const hasAccess = canAccess(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showPreview) {
    return (
      <div className={cn("relative", className)}>
        <div className="pointer-events-none opacity-50 blur-[1px]">
          {children}
        </div>
        <UpgradeOverlay feature={feature} />
      </div>
    );
  }

  return <UpgradePrompt feature={feature} className={className} />;
}

interface TierGateProps {
  tier: Tier;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showPreview?: boolean;
  className?: string;
}

/**
 * Component that conditionally renders children based on tier level
 */
export function TierGate({
  tier,
  children,
  fallback,
  showPreview = false,
  className,
}: TierGateProps) {
  const { canAccessTier } = usePermissionStore();

  const hasAccess = canAccessTier(tier);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showPreview) {
    return (
      <div className={cn("relative", className)}>
        <div className="pointer-events-none opacity-50 blur-[1px]">
          {children}
        </div>
        <TierUpgradeOverlay tier={tier} />
      </div>
    );
  }

  return <TierUpgradePrompt tier={tier} className={className} />;
}

/**
 * Overlay shown on preview content
 */
function UpgradeOverlay({ feature }: { feature: Feature }) {
  const requiredTier = FEATURE_TIER_MAP[feature];
  const tierInfo = getTierInfo(requiredTier);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
      <div className="text-center p-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm font-medium mb-2">Upgrade to {tierInfo.name}</p>
        <Button size="sm" variant="default">
          Upgrade Now
          <ArrowUpRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function TierUpgradeOverlay({ tier }: { tier: Tier }) {
  const tierInfo = getTierInfo(tier);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
      <div className="text-center p-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm font-medium mb-2">Upgrade to {tierInfo.name}</p>
        <Button size="sm" variant="default">
          Upgrade Now
          <ArrowUpRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Upgrade prompt component
 */
function UpgradePrompt({
  feature,
  className,
}: {
  feature: Feature;
  className?: string;
}) {
  const requiredTier = FEATURE_TIER_MAP[feature];
  const tierInfo = getTierInfo(requiredTier);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-muted/30",
        className,
      )}
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
        {requiredTier === Tier.INTELLIGENCE ? (
          <Sparkles className="w-8 h-8 text-primary" />
        ) : (
          <Lock className="w-8 h-8 text-primary" />
        )}
      </div>
      <h3 className="text-lg font-semibold mb-2">Feature Locked</h3>
      <p className="text-muted-foreground text-center mb-4 max-w-md">
        This feature requires{" "}
        <span className="font-medium text-foreground">{tierInfo.name}</span>.
        {tierInfo.description && (
          <span className="block text-sm mt-1">{tierInfo.description}</span>
        )}
      </p>
      <Button>
        Upgrade to {tierInfo.name}
        <ArrowUpRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

function TierUpgradePrompt({
  tier,
  className,
}: {
  tier: Tier;
  className?: string;
}) {
  const tierInfo = getTierInfo(tier);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 border border-dashed rounded-lg bg-muted/30",
        className,
      )}
    >
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
        {tier === Tier.INTELLIGENCE ? (
          <Sparkles className="w-8 h-8 text-primary" />
        ) : (
          <Lock className="w-8 h-8 text-primary" />
        )}
      </div>
      <h3 className="text-lg font-semibold mb-2">Feature Locked</h3>
      <p className="text-muted-foreground text-center mb-4 max-w-md">
        This feature requires{" "}
        <span className="font-medium text-foreground">{tierInfo.name}</span>.
        {tierInfo.description && (
          <span className="block text-sm mt-1">{tierInfo.description}</span>
        )}
      </p>
      <Button>
        Upgrade to {tierInfo.name}
        <ArrowUpRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

/**
 * Hook for checking feature access
 */
export function useFeatureAccess(feature: Feature) {
  const { canAccess, getRequiredTier } = usePermissionStore();

  return {
    hasAccess: canAccess(feature),
    requiredTier: getRequiredTier(feature),
    tierInfo: getTierInfo(getRequiredTier(feature)),
  };
}

/**
 * Badge component to show tier requirement
 */
export function TierBadge({
  tier,
  className,
}: {
  tier: Tier;
  className?: string;
}) {
  const tierInfo = getTierInfo(tier);

  const colorClasses: Record<string, string> = {
    gray: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    green: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    purple:
      "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    orange:
      "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    pink: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        colorClasses[tierInfo.color] || colorClasses.gray,
        className,
      )}
    >
      {tier === Tier.INTELLIGENCE && <Sparkles className="w-3 h-3 mr-1" />}
      {tierInfo.name.replace("Docita ", "")}
    </span>
  );
}

/**
 * Badge component that derives tier from feature - single source of truth
 */
export function FeatureTierBadge({
  feature,
  className,
}: {
  feature: Feature;
  className?: string;
}) {
  const requiredTier = FEATURE_TIER_MAP[feature];
  return <TierBadge tier={requiredTier} className={className} />;
}

/**
 * Locked indicator for navigation items
 */
export function LockedIndicator({ feature }: { feature: Feature }) {
  const { isFeatureLocked } = usePermissionStore();

  if (!isFeatureLocked(feature)) {
    return null;
  }

  return <Lock className="w-3.5 h-3.5 text-muted-foreground ml-auto" />;
}
