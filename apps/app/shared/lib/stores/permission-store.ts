import { create } from "zustand";
import {
  type ClinicFeatureOverrides,
  Feature,
  FEATURE_TIER_MAP,
  type FacilityTypeType,
  type PlanMode,
  Tier,
  TIER_INFO,
} from "@workspace/types";
import { mapDbClinicTierToTierAndMode } from "@workspace/types/access";
import { type ClinicType } from "@workspace/types/shared";
import { type Permission } from "@/lib/auth/permissions";
import {
  checkClinicTypeFeature,
  checkFeatureAccess,
  resolveRequiredTierForFeature,
  resolveTierDisplayInfo,
  type PermissionAccessContext,
} from "./permission-access-checks";
import {
  parseClinicTypeInput,
  parseFeatureOverridesInput,
  parsePlanModeInput,
  parseTierInput,
} from "./permission-state-setters";
import { AI_FEATURES_ENABLED, AI_GATED_FEATURES } from "@/lib/config/ai-features";

export { Tier, Feature, FEATURE_TIER_MAP, TIER_INFO };

export type FacilityType = FacilityTypeType;

interface PermissionState {
  currentTier: Tier;
  currentMode: PlanMode;
  hasIntelligence: boolean;
  userRole: string | null;
  facilityType: FacilityType;
  clinicType: ClinicType | null;
  featureOverrides: ClinicFeatureOverrides;

  setTier: (tier: Tier | string) => void;
  setMode: (mode: PlanMode | string | null | undefined) => void;
  setIntelligence: (active: boolean) => void;
  setUserRole: (role: string) => void;
  setFacilityType: (type: FacilityType) => void;
  setClinicType: (type: ClinicType | string | null) => void;
  setFeatureOverrides: (
    overrides: ClinicFeatureOverrides | Record<string, boolean>,
  ) => void;
  syncFromClinic: (
    clinic: {
      tier: string;
      planMode?: string | null;
      intelligenceAddon?: string | null;
      features?: Record<string, boolean> | null;
      type?: string | null;
      settings?: Record<string, unknown> | null;
    },
    userRole?: string,
  ) => void;

  canAccess: (feature: Feature, permission?: Permission) => boolean;
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

function selectAccessContext(state: PermissionState): PermissionAccessContext {
  return {
    currentTier: state.currentTier,
    currentMode: state.currentMode,
    hasIntelligence: state.hasIntelligence,
    featureOverrides: state.featureOverrides,
    userRole: state.userRole,
    clinicType: state.clinicType,
  };
}

export const usePermissionStore = create<PermissionState>((set, get) => ({
  currentTier: Tier.STARTER,
  currentMode: "FULL",
  hasIntelligence: false,
  userRole: null,
  facilityType: "CLINIC",
  clinicType: null,
  featureOverrides: {},

  setTier: (tier) => {
    set({ currentTier: parseTierInput(tier) });
  },

  setMode: (mode) => {
    set({ currentMode: parsePlanModeInput(mode) });
  },

  // AI master switch: Intelligence add-on is forced off in the UI while AI is
  // globally disabled, so every intelligence-gated surface (Ask AI, command
  // palette, AI hints) disappears.
  setIntelligence: (active) =>
    set({ hasIntelligence: AI_FEATURES_ENABLED && active }),

  setUserRole: (role) => set({ userRole: role }),
  setFacilityType: (type) => set({ facilityType: type }),

  setClinicType: (type) => {
    set({ clinicType: parseClinicTypeInput(type) });
  },

  setFeatureOverrides: (overrides) => {
    set({ featureOverrides: parseFeatureOverridesInput(overrides) });
  },

  syncFromClinic: (clinic, userRole) => {
    const { setTier, setMode, setIntelligence, setUserRole, setClinicType, setFeatureOverrides } = get();
    const { tier: resolvedTierName, mode: resolvedMode } =
      mapDbClinicTierToTierAndMode(clinic.tier, clinic.planMode);

    setTier(resolvedTierName);
    setMode(resolvedMode);
    setIntelligence(clinic.intelligenceAddon === "ACTIVE");
    setFeatureOverrides(clinic.features || {});

    if (clinic.type) {
      setClinicType(clinic.type);
    }
    if (userRole) {
      setUserRole(userRole);
    }
  },

  canAccess: (feature, permission?) => {
    // AI master switch: AI-dependent features are unavailable in the UI while
    // AI is globally disabled, regardless of tier/overrides.
    if (!AI_FEATURES_ENABLED && AI_GATED_FEATURES.has(feature)) return false;
    return checkFeatureAccess(selectAccessContext(get()), feature, permission);
  },

  canAccessClinicFeature: (feature) => {
    return checkClinicTypeFeature(get().clinicType, feature);
  },

  isFeatureLocked: (feature) => {
    return !checkFeatureAccess(selectAccessContext(get()), feature);
  },

  getRequiredTier: (feature) => {
    return resolveRequiredTierForFeature(feature);
  },

  getTierInfo: (tier) => {
    const targetTier = tier ?? get().currentTier;
    return resolveTierDisplayInfo(targetTier);
  },
}));
