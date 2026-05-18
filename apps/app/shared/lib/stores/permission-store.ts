import { create } from "zustand";
import {
  CLINIC_TYPE_FEATURES,
  type ClinicType,
  Feature,
  FEATURE_TIER_MAP,
  FRONT_DESK_BLOCKED_FEATURES,
  isFeatureGenerallyAvailable,
  mapClinicTierDbStringToAccessTier,
  Tier,
  TIER_INFO,
  type UserRole,
  type WorkspaceProfile,
  DEFAULT_WORKSPACE_PROFILE,
  getTierName,
  parseWorkspaceProfile,
} from "@workspace/types";
import { hasPermission, type Permission } from "@/lib/auth/permissions";

export { Tier, Feature, FEATURE_TIER_MAP, TIER_INFO };

export type FacilityType = "CLINIC" | "HOSPITAL";

interface PermissionState {
  currentTier: Tier;
  hasIntelligence: boolean;
  userRole: string | null;
  facilityType: FacilityType;
  clinicType: ClinicType | null;
  featureOverrides: Record<string, boolean>;
  workspaceProfile: WorkspaceProfile;

  setTier: (tier: Tier | string) => void;
  setIntelligence: (active: boolean) => void;
  setUserRole: (role: string) => void;
  setFacilityType: (type: FacilityType) => void;
  setClinicType: (type: ClinicType | string | null) => void;
  setFeatureOverrides: (overrides: Record<string, boolean>) => void;
  setWorkspaceProfile: (profile: unknown) => void;
  syncFromClinic: (clinic: {
    tier: string;
    intelligenceAddon?: string | null;
    features?: Record<string, boolean> | null;
    type?: string | null;
    workspaceProfile?: WorkspaceProfile | string | null;
    settings?: Record<string, unknown> | null;
  }, userRole?: string) => void;

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
  currentTier: Tier.STARTER,
  hasIntelligence: false,
  userRole: null,
  facilityType: "CLINIC", 
  clinicType: null, 
  featureOverrides: {},
  workspaceProfile: DEFAULT_WORKSPACE_PROFILE,

  setTier: (tier) => {
    const parsedTier =
      typeof tier === "string"
        ? mapClinicTierDbStringToAccessTier(tier)
        : tier;

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

  setWorkspaceProfile: (profile: unknown) =>
    set({ workspaceProfile: parseWorkspaceProfile(profile) }),

  syncFromClinic: (clinic, userRole) => {
    const {
      setTier,
      setIntelligence,
      setUserRole,
      setClinicType,
      setFeatureOverrides,
      setWorkspaceProfile,
    } = get();

    setTier(clinic.tier);
    setIntelligence(clinic.intelligenceAddon === 'ACTIVE');
    setFeatureOverrides(clinic.features || {});

    const fromRoot = clinic.workspaceProfile;
    const fromSettings =
      clinic.settings && typeof clinic.settings === "object" && !Array.isArray(clinic.settings)
        ? (clinic.settings as Record<string, unknown>).workspaceProfile
        : undefined;
    if (clinic.tier === "FRONT_DESK") {
      setWorkspaceProfile("FRONT_DESK");
    } else {
      setWorkspaceProfile(fromRoot ?? fromSettings);
    }

    if (clinic.type) {
      setClinicType(clinic.type);
    }

    if (userRole) {
      setUserRole(userRole);
    }
  },

  canAccess: (feature, permission?) => {
    const { currentTier, hasIntelligence, featureOverrides, userRole } = get();

    if (!isFeatureGenerallyAvailable(feature)) {
      return false;
    }

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

    if (currentTier === Tier.FRONT_DESK) {
      if (FRONT_DESK_BLOCKED_FEATURES.has(feature)) {
        return false;
      }
      return Tier.ESSENTIAL >= requiredTier;
    }

    return currentTier >= requiredTier;
  },

  canAccessTier: (tier) => {
    const { currentTier, hasIntelligence } = get();

    if (tier === Tier.INTELLIGENCE) {
      return hasIntelligence;
    }

    if (currentTier === Tier.FRONT_DESK) {
      return tier <= Tier.ESSENTIAL;
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
    const tierName = getTierName(targetTier);
    return TIER_INFO[tierName];
  },
}));
