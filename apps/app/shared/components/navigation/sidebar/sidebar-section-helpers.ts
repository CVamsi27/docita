import { canAccessTarget } from "@/lib/access-control/access-policy";
import { ClinicFeatureService } from "@/lib/services/clinic-feature.service";
import { APP_ACCESS_TARGETS, clinicTypeSchema } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";
import {
  type NavItem,
  type NavSection,
  SPECIALTY_ICONS,
  SPECIALTY_URLS,
  IPD_NAV_ITEM,
} from "@/components/navigation/nav-config";

import type { Permission } from "@/lib/auth/permissions";
import type { Feature, PlanMode, Tier } from "@workspace/types/billing";
import type { UserRole } from "@workspace/types/shared";

export function isItemAccessible(
  item: NavItem,
  ctx: {
    role: UserRole | undefined;
    canAccess: (feature: Feature, permission?: Permission) => boolean;
    currentTier: Tier;
    currentMode: PlanMode;
    hasIntelligence: boolean;
  },
): boolean {
  if (item.accessTarget) {
    return canAccessTarget(
      item.accessTarget,
      {
        role: ctx.role,
        canAccessFeature: ctx.canAccess,
        currentTier: ctx.currentTier,
        currentMode: ctx.currentMode,
        hasIntelligence: ctx.hasIntelligence,
      },
      "read",
    );
  }
  return !item.feature || ctx.canAccess(item.feature);
}

export function buildSpecialtyNavItems(
  clinicTypeRaw: string | null | undefined,
): NavItem[] {
  const clinicType = clinicTypeRaw
    ? (parseStringEnumMember(
        clinicTypeSchema.options,
        String(clinicTypeRaw).toUpperCase(),
      ) ?? undefined)
    : undefined;

  const specialtySections = ClinicFeatureService.getSpecialtySections(clinicType);
  return specialtySections.map((section) => ({
    href: SPECIALTY_URLS[section.id] || `/specialty/${section.id}`,
    icon: SPECIALTY_ICONS[section.icon] ?? SPECIALTY_ICONS.Smile,
    label: section.label,
    accessTarget: APP_ACCESS_TARGETS.PAGE_SPECIALTY,
  }));
}

export function buildDynamicSection(
  specialtyNavItems: NavItem[],
  hospitalNavItems: NavItem[],
  ctx: {
    role: UserRole | undefined;
    canAccess: (feature: Feature, permission?: Permission) => boolean;
    currentTier: Tier;
    currentMode: PlanMode;
    hasIntelligence: boolean;
  },
): NavSection | null {
  const items = [...specialtyNavItems, ...hospitalNavItems].filter((item) =>
    isItemAccessible(item, ctx),
  );
  if (items.length === 0) return null;
  return { id: "services", label: "Specialty", items };
}

export function buildHospitalNavItems(clinicType: string | undefined): NavItem[] {
  return clinicType === "SPECIALTY" ? [IPD_NAV_ITEM] : [];
}
