import { create } from "zustand";
import {
  Feature,
  FEATURE_TIER_MAP,
  Tier,
  TIER_INFO,
  TierName,
} from "@workspace/types";

// Re-export for convenience
export { Tier, Feature, FEATURE_TIER_MAP, TIER_INFO };

interface PermissionState {
  currentTier: Tier;
  hasIntelligence: boolean;
  userRole: string | null;
  featureOverrides: Record<string, boolean>;

  setTier: (tier: Tier | string) => void;
  setIntelligence: (active: boolean) => void;
  setUserRole: (role: string) => void;
  setFeatureOverrides: (overrides: Record<string, boolean>) => void;

  canAccess: (feature: Feature) => boolean;
  canAccessTier: (tier: Tier) => boolean;
  isFeatureLocked: (feature: Feature) => boolean;
  getRequiredTier: (feature: Feature) => Tier;
  getTierInfo: (tier?: Tier) => {
    name: string;
    description: string;
    tagline: string;
    color: string;
  };
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  currentTier: Tier.CAPTURE,
  hasIntelligence: false,
  userRole: null,
  featureOverrides: {},

  setTier: (tier) => {
    let parsedTier = Tier.CAPTURE;

    if (typeof tier === "string") {
      switch (tier) {
        case "CAPTURE":
          parsedTier = Tier.CAPTURE;
          break;
        case "CORE":
          parsedTier = Tier.CORE;
          break;
        case "PLUS":
          parsedTier = Tier.PLUS;
          break;
        case "PRO":
          parsedTier = Tier.PRO;
          break;
        case "ENTERPRISE":
          parsedTier = Tier.ENTERPRISE;
          break;
        // Legacy mappings
        case "FREE":
          parsedTier = Tier.CAPTURE;
          break;
        case "STARTER":
          parsedTier = Tier.CORE;
          break;
        case "PROFESSIONAL":
          parsedTier = Tier.PRO;
          break;
        default:
          parsedTier = Tier.CAPTURE;
      }
    } else {
      parsedTier = tier;
    }

    set({ currentTier: parsedTier });
  },

  setIntelligence: (active) => set({ hasIntelligence: active }),

  setUserRole: (role) => set({ userRole: role }),

  setFeatureOverrides: (overrides) => set({ featureOverrides: overrides }),

  canAccess: (feature) => {
    const { currentTier, hasIntelligence, featureOverrides } = get();

    // Check custom override first
    if (featureOverrides[feature] !== undefined) {
      return featureOverrides[feature];
    }

    const requiredTier = FEATURE_TIER_MAP[feature];

    // Intelligence features require the add-on
    if (requiredTier === Tier.INTELLIGENCE) {
      return hasIntelligence;
    }

    return currentTier >= requiredTier;
  },

  canAccessTier: (tier) => {
    const { currentTier, hasIntelligence } = get();

    if (tier === Tier.INTELLIGENCE) {
      return hasIntelligence;
    }

    return currentTier >= tier;
  },

  isFeatureLocked: (feature) => {
    return !get().canAccess(feature);
  },

  getRequiredTier: (feature) => {
    return FEATURE_TIER_MAP[feature];
  },

  getTierInfo: (tier) => {
    const targetTier = tier ?? get().currentTier;
    const tierName = Tier[targetTier] as TierName;
    return TIER_INFO[tierName];
  },
}));
