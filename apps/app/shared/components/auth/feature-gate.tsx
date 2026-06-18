"use client";

import React from "react";
import { Feature, FEATURE_TIER_MAP, Tier } from "@workspace/types";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { LockedFeatureCard } from "./feature-gate-sections";

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

export {
  FeatureTierBadge,
  TierBadge,
  LockedFeatureIndicator,
} from "./feature-gate-sections";

export type {
  FeatureTierBadgeProps,
  TierBadgeProps,
} from "./feature-gate-sections";

// Shared by `FeatureGate` and `TierGate` — once each has resolved whether
// the current user has access, both pick the rendered outcome the same way:
// children when granted, the caller's fallback when provided, the locked
// card when requested, otherwise nothing. Centralizing that decision keeps
// the two gates from drifting apart on precedence.
function renderGateOutcome({
  hasAccess,
  children,
  fallback,
  showLockedCard,
  lockedCard,
}: {
  hasAccess: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showLockedCard: boolean;
  lockedCard: React.ReactNode;
}): React.ReactNode {
  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showLockedCard) {
    return lockedCard;
  }

  return null;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showLockedCard = false,
}: FeatureGateProps) {
  const { canAccess } = usePermissionStore();
  const hasAccess = canAccess(feature);

  return renderGateOutcome({
    hasAccess,
    children,
    fallback,
    showLockedCard,
    lockedCard: <LockedFeatureCard feature={feature} />,
  });
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
  }[tier];
  const hasAccess = canAccess(tierFeature ?? Feature.BASIC_PATIENT_MANAGEMENT);

  return renderGateOutcome({
    hasAccess,
    children,
    fallback,
    showLockedCard,
    lockedCard: <LockedFeatureCard tier={tier} />,
  });
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

export type { FeatureGateProps, TierGateProps };
