"use client";

import { useCallback, useMemo } from "react";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { useAuth } from "@/lib/auth/auth-context";
import { useAppConfig } from "@/lib/contexts/app-config-context";
import { canAccessTarget } from "@/lib/access-control/access-policy";
import { canManageBilling } from "@/lib/auth/permissions";
import { ClinicFeatureService } from "@/lib/services/clinic-feature.service";
import { APP_ACCESS_TARGETS, clinicTypeSchema } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";
import { CLINIC_ADMIN_ROLES } from "@/lib/auth/permissions";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useSidebarPreferences } from "@/hooks/use-sidebar-preferences";
import { useSidebarNavOrder } from "@/hooks/use-sidebar-nav-order";
import {
  useUnreadNotificationCount,
  usePendingJoinRequestCount,
  useSubscription,
} from "@workspace/data-access";
import { resolveCurrentPlanTier } from "@/lib/subscription/current-plan-tier";
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
  const { user, isLoading: authLoading, token } = useAuth();
  const { clinicId } = useClinic();
  const {
    canAccess,
    currentTier,
    currentMode,
    hasIntelligence,
    getTierInfo,
    clinicType: storeClinicType,
  } = usePermissionStore();
  const { getClinicSetting } = useAppConfig();
  const { isHidden, toggleItem } = useSidebarPreferences(clinicId);

  const isAdmin = !!user?.role && CLINIC_ADMIN_ROLES.has(user.role);

  const canAccessNotifications = canAccessTarget(
    APP_ACCESS_TARGETS.API_STAFF_NOTIFICATIONS,
    {
      role: user?.role,
      canAccessFeature: canAccess,
      currentTier,
      currentMode,
      hasIntelligence,
    },
    "read",
  );

  const canAccessSettings = canAccessTarget(
    APP_ACCESS_TARGETS.PAGE_SETTINGS,
    {
      role: user?.role,
      canAccessFeature: canAccess,
      currentTier,
      currentMode,
      hasIntelligence,
    },
    "read",
  );

  const canOpenBillingSettings = !!user?.role && canManageBilling(user.role);

  const { data: unreadNotificationCount } = useUnreadNotificationCount(
    canAccessNotifications,
  );
  const { data: pendingJoinRequestData } = usePendingJoinRequestCount(
    isAdmin && !authLoading && Boolean(token),
  );

  const notificationCount = unreadNotificationCount?.count ?? 0;
  const pendingJoinRequestCount = pendingJoinRequestData?.count ?? 0;

  const clinicTypeRaw = storeClinicType || getClinicSetting("clinicType");
  const clinicType = clinicTypeRaw
    ? (parseStringEnumMember(
        clinicTypeSchema.options,
        String(clinicTypeRaw).toUpperCase(),
      ) ?? undefined)
    : undefined;

  const specialtySections =
    ClinicFeatureService.getSpecialtySections(clinicType);

  const specialtyNavItems: NavItem[] = specialtySections.map((section) => ({
    href: SPECIALTY_URLS[section.id] || `/specialty/${section.id}`,
    icon: SPECIALTY_ICONS[section.icon] ?? SPECIALTY_ICONS.Smile,
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
          currentTier,
          currentMode,
          hasIntelligence,
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

  // The PLAN badge shows the plan the clinic is subscribed to (billing truth),
  // not the access tier — so an Essential trial reads "Essential", consistent
  // with the billing page. Access gating still uses `currentTier`.
  const { data: subscription } = useSubscription({ enabled: isAdmin });
  const subscriptionPeriodEnd = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd)
    : null;
  const isTrialExpired =
    subscription?.subscriptionStatus === "TRIALING" &&
    subscriptionPeriodEnd !== null
      ? subscriptionPeriodEnd.getTime() <= Date.now()
      : false;
  const currentPlanTier = resolveCurrentPlanTier({
    subscriptionTier: subscription?.tier,
    isTrialExpired,
    accessTier: currentTier,
  });
  const tierInfo = getTierInfo(currentPlanTier);

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
