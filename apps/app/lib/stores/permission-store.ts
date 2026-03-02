import { create } from "zustand";
import {
  CLINIC_TYPE_FEATURES,
  type ClinicType,
  Feature,
  FEATURE_TIER_MAP,
  Tier,
  TIER_INFO,
  TierName,
  type UserRole,
} from "@workspace/types";
import { hasPermission, type Permission } from "@/lib/permissions";

export { Tier, Feature, FEATURE_TIER_MAP, TIER_INFO };

export type FacilityType = "CLINIC" | "HOSPITAL";

interface PermissionState {
  currentTier: Tier;
  hasIntelligence: boolean;
  userRole: string | null;
  facilityType: FacilityType;
  clinicType: ClinicType | null;
  featureOverrides: Record<string, boolean>;

  setTier: (tier: Tier | string) => void;
  setIntelligence: (active: boolean) => void;
  setUserRole: (role: string) => void;
  setFacilityType: (type: FacilityType) => void;
  setClinicType: (type: ClinicType | string | null) => void;
  setFeatureOverrides: (overrides: Record<string, boolean>) => void;

  canAccess: (feature: Feature, permission?: Permission) => boolean;
  canAccessTier: (tier: Tier) => boolean;
  canAccessClinicFeature: (feature: string) => boolean;
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
  facilityType: "CLINIC", 
  clinicType: null, 
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
  setFacilityType: (type) => set({ facilityType: type }),

  setClinicType: (type) => {

    if (type === null) {
      set({ clinicType: null });
      return;
    }

    const normalized = (
      typeof type === "string" ? type.toUpperCase() : type
    ) as ClinicType;
    set({ clinicType: normalized });
  },

  setFeatureOverrides: (overrides) => set({ featureOverrides: overrides }),

  canAccess: (feature, permission?) => {
    const { currentTier, hasIntelligence, featureOverrides, userRole } = get();

    if (permission && userRole) {
      if (!hasPermission(userRole as UserRole, permission)) {
        return false;
      }
    }

    if (featureOverrides[feature] !== undefined) {
      return featureOverrides[feature];
    }

    const requiredTier = FEATURE_TIER_MAP[feature];

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

  
  canAccessClinicFeature: (feature) => {
    const { clinicType } = get();

    if (!clinicType) {
      return true;
    }

    const typeFeatures = CLINIC_TYPE_FEATURES[clinicType];
    if (!typeFeatures) {
      return true; 
    }

    const featureKey = feature as keyof typeof typeFeatures;
    if (featureKey in typeFeatures) {
      return typeFeatures[featureKey] === true;
    }

    return true;
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
