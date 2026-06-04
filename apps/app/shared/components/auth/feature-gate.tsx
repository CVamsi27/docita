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
  const hasAccess = canAccess(tierFeature ?? Feature.BASIC_PATIENT_MANAGEMENT);

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
