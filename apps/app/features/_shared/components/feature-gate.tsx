"use client";

import React from "react";
import { Badge } from "@workspace/ui/components/badge";
import { Feature, Tier, TierName, TIER_INFO } from "@workspace/types";

// Re-export for convenience
export { Feature, Tier };

// Type definitions
interface FeatureGateProps {
  feature?: Feature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface TierGateProps {
  children: React.ReactNode;
  tier?: Tier;
  fallback?: React.ReactNode;
}

interface FeatureTierBadgeProps {
  feature?: Feature;
  className?: string;
}

interface TierBadgeProps {
  tier?: Tier;
  className?: string;
}

// Feature Gate - allows access based on feature flags
export function FeatureGate({ children }: FeatureGateProps) {
  // In production, check feature flags from context
  return <>{children}</>;
}

// Feature Tier Badge - shows which tier a feature requires
export function FeatureTierBadge({
  feature,
  className,
}: FeatureTierBadgeProps) {
  if (!feature) return null;
  return (
    <Badge variant="outline" className={className}>
      Pro
    </Badge>
  );
}

// Tier Badge - shows current subscription tier
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

// Tier Gate - allows access based on subscription tier
export function TierGate({ children }: TierGateProps) {
  // In production, check tier from context
  return <>{children}</>;
}

// Hook to check if a feature is enabled
export function useFeature(feature?: Feature): boolean {
  // In production, check from feature flag context
  return true;
}

// Hook to get current subscription tier
export function useTier(): Tier {
  // In production, get from subscription context
  return Tier.ENTERPRISE;
}

// Export types
export type {
  FeatureGateProps,
  TierGateProps,
  FeatureTierBadgeProps,
  TierBadgeProps,
};
