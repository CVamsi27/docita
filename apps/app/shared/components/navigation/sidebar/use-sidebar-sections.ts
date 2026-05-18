"use client";

import { useCallback, useMemo } from "react";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { useAuth } from "@/lib/auth/auth-context";
import { useAppConfig } from "@/lib/contexts/app-config-context";
import { canAccessTarget } from "@/lib/access-control/access-policy";
import { canManageBilling } from "@/lib/auth/permissions";
import { ClinicFeatureService } from "@/lib/services/clinic-feature.service";
import { APP_ACCESS_TARGETS, type ClinicType } from "@workspace/types";
import { CLINIC_ADMIN_ROLES } from "@/lib/auth/permissions";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useSidebarPreferences } from "@/hooks/use-sidebar-preferences";
import { useSidebarNavOrder } from "@/hooks/use-sidebar-nav-order";
import {
  useUnreadNotificationCount,
  usePendingJoinRequestCount,
} from "@/hooks/api/use-notifications";
import {
  AI_ASSISTANT_NAV_ITEM,
  FIXED_NAV_HREFS,
  IPD_NAV_ITEM,
  navSections,
  SPECIALTY_ICONS,
  SPECIALTY_URLS,
  type NavItem,
  type NavSection,
} from "@/components/navigation/nav-config";

export function useSidebarSections() {
  const { user } = useAuth();
  const { clinicId } = useClinic();
  const {
    canAccess,
    canAccessTier,
    getTierInfo,
    clinicType: storeClinicType,
    workspaceProfile,
  } = usePermissionStore();
  const { getClinicSetting } = useAppConfig();
  const { isHidden, toggleItem } = useSidebarPreferences(clinicId);

  const isAdmin = !!user?.role && CLINIC_ADMIN_ROLES.has(user.role);

  const canAccessNotifications = canAccessTarget(
    APP_ACCESS_TARGETS.API_STAFF_NOTIFICATIONS,
    {
      role: user?.role,
      canAccessFeature: canAccess,
      canAccessTier,
      workspaceProfile,
    },
    "read",
  );

  const canAccessSettings = canAccessTarget(
    APP_ACCESS_TARGETS.PAGE_SETTINGS,
    {
      role: user?.role,
      canAccessFeature: canAccess,
      canAccessTier,
      workspaceProfile,
    },
    "read",
  );

  const canOpenBillingSettings = !!user?.role && canManageBilling(user.role);

  const { data: unreadNotificationCount } =
    useUnreadNotificationCount(canAccessNotifications);
  const { data: pendingJoinRequestData } = usePendingJoinRequestCount(isAdmin);

  const notificationCount = unreadNotificationCount?.count ?? 0;
  const pendingJoinRequestCount = pendingJoinRequestData?.count ?? 0;

  const clinicType = (storeClinicType ||
    getClinicSetting("clinicType")) as ClinicType | undefined;

  const specialtySections =
    ClinicFeatureService.getSpecialtySections(clinicType);

  const specialtyNavItems: NavItem[] = specialtySections.map((section) => ({
    href: SPECIALTY_URLS[section.id] || `/specialty/${section.id}`,
    icon: SPECIALTY_ICONS[section.icon] || SPECIALTY_ICONS["Brain"]!,
    label: section.label,
    accessTarget: APP_ACCESS_TARGETS.PAGE_SPECIALTY,
  }));

  const hospitalNavItems: NavItem[] =
    clinicType === "SPECIALTY" ? [IPD_NAV_ITEM] : [];

  function isItemAccessible(item: NavItem): boolean {
    if (item.accessTarget) {
      return canAccessTarget(
        item.accessTarget,
        {
          role: user?.role,
          canAccessFeature: canAccess,
          canAccessTier,
          workspaceProfile,
        },
        "read",
      );
    }
    return !item.feature || canAccess(item.feature);
  }

  const sectionsWithAccess: NavSection[] = navSections.map((section) => ({
    ...section,
    items: section.items.filter(isItemAccessible),
  }));

  const dynamicSection: NavSection | null =
    specialtyNavItems.length + hospitalNavItems.length > 0
      ? {
          id: "services",
          label: "Specialty",
          items: [...specialtyNavItems, ...hospitalNavItems].filter(
            isItemAccessible,
          ),
        }
      : null;

  const aiAssistantAccessible = isItemAccessible(AI_ASSISTANT_NAV_ITEM);

  const filterByPreferences = useCallback(
    (items: NavItem[]) =>
      items.filter(
        (item) => FIXED_NAV_HREFS.has(item.href) || !isHidden(item.href),
      ),
    [isHidden],
  );

  const visibleSections = useMemo(
    () =>
      sectionsWithAccess.map((section) => ({
        ...section,
        items: filterByPreferences(section.items),
      })),
    [sectionsWithAccess, filterByPreferences],
  );

  const navOrder = useSidebarNavOrder({
    clinicId,
    userId: user?.id ?? null,
    canEditClinicDefault: isAdmin,
  });

  const orderedVisibleSections = navOrder.orderSections(visibleSections);

  const tierInfo = getTierInfo();

  return {
    // sections
    sectionsWithAccess,
    visibleSections,
    orderedVisibleSections,
    dynamicSection,
    aiAssistantAccessible,
    // permissions
    isAdmin,
    canAccessNotifications,
    canAccessSettings,
    canOpenBillingSettings,
    // notifications
    notificationCount,
    pendingJoinRequestCount,
    // tier
    tierInfo,
    // nav order
    navOrder,
    // preferences
    isHidden,
    toggleItem,
    // helpers
    isItemAccessible,
  };
}
