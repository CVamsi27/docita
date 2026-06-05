import { create } from "zustand";
import {
  clinicFeatureOverridesSchema,
  type ClinicFeatureOverrides,
  Feature,
  FEATURE_TIER_MAP,
  type PlanMode,
  planModeSchema,
  Tier,
  TIER_INFO,
} from "@workspace/types/billing";
import {
  mapClinicTierDbStringToAccessTier,
  mapDbClinicTierToTierAndMode,
} from "@workspace/types/access";
import {
  CLINIC_TYPE_FEATURES,
  type ClinicType,
  clinicTypeSchema,
  userRoleSchema,
} from "@workspace/types/shared";
import {
  getTierName,
  hasFeatureAccess,
  isFeatureGenerallyAvailable,
} from "@workspace/utils";
import { hasPermission, type Permission } from "@/lib/auth/permissions";

export { Tier, Feature, FEATURE_TIER_MAP, TIER_INFO };

export type FacilityType = "CLINIC" | "HOSPITAL";

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

export const usePermissionStore = create<PermissionState>((set, get) => ({
  currentTier: Tier.STARTER,
  currentMode: "FULL",
  hasIntelligence: false,
  userRole: null,
  facilityType: "CLINIC",
  clinicType: null,
  featureOverrides: {},

  setTier: (tier) => {
    const parsedTier =
      typeof tier === "string" ? mapClinicTierDbStringToAccessTier(tier) : tier;

    set({ currentTier: parsedTier });
  },

  setMode: (mode) => {
    const parsed = planModeSchema.safeParse(mode ?? "FULL");
    set({ currentMode: parsed.success ? parsed.data : "FULL" });
  },

  setIntelligence: (active) => set({ hasIntelligence: active }),

  setUserRole: (role) => set({ userRole: role }),
  setFacilityType: (type) => set({ facilityType: type }),

  setClinicType: (type) => {
    if (type === null) {
      set({ clinicType: null });
      return;
    }

    const raw = typeof type === "string" ? type.toUpperCase() : type;
    const parsed = clinicTypeSchema.safeParse(raw);
    if (parsed.success) {
      set({ clinicType: parsed.data });
    }
  },

  setFeatureOverrides: (overrides) => {
    const parsed = clinicFeatureOverridesSchema.safeParse(overrides ?? {});
    set({ featureOverrides: parsed.success ? parsed.data : {} });
  },

  syncFromClinic: (clinic, userRole) => {
    const {
      setTier,
      setMode,
      setIntelligence,
      setUserRole,
      setClinicType,
      setFeatureOverrides,
    } = get();

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
    const {
      currentTier,
      currentMode,
      hasIntelligence,
      featureOverrides,
      userRole,
    } = get();

    if (!isFeatureGenerallyAvailable(feature)) {
      return false;
    }

    if (permission && userRole) {
      const parsedRole = userRoleSchema.safeParse(userRole);
      if (!parsedRole.success || !hasPermission(parsedRole.data, permission)) {
        return false;
      }
    }

    const tierName = getTierName(currentTier);
    return hasFeatureAccess(
      tierName,
      feature,
      hasIntelligence,
      featureOverrides,
      currentMode,
    );
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

    const match = Object.entries(typeFeatures).find(([key]) => key === feature);
    if (match) {
      return match[1] === true;
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
