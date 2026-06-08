"use client";

import { useCallback, useMemo } from "react";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { useAuth } from "@/lib/auth/auth-context";
import { useAppConfig } from "@/lib/contexts/app-config-context";
import { canAccessTarget } from "@/lib/access-control/access-policy";
import { canManageBilling } from "@/lib/auth/permissions";
import { APP_ACCESS_TARGETS, clinicTypeSchema } from "@workspace/types";
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
  navSections,
  type NavItem,
  type NavSection,
} from "@/components/navigation/nav-config";
import { parseStringEnumMember } from "@workspace/utils";
import {
  isItemAccessible,
  buildSpecialtyNavItems,
  buildHospitalNavItems,
  buildDynamicSection,
} from "./sidebar-section-helpers";

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

  // Shared by `canAccessNotifications` and `canAccessSettings` — both read
  // checks evaluate the same access context (role, tier, mode, intelligence
  // add-on) against `APP_ACCESS_MATRIX`, varying only in which target they
  // check, so the context shape lives in one place rather than the two
  // checks drifting apart.
  const checkAppAccess = (target: Parameters<typeof canAccessTarget>[0]) =>
    canAccessTarget(
      target,
      {
        role: user?.role,
        canAccessFeature: canAccess,
        currentTier,
        currentMode,
        hasIntelligence,
      },
      "read",
    );

  const canAccessNotifications = checkAppAccess(
    APP_ACCESS_TARGETS.API_STAFF_NOTIFICATIONS,
  );

  const canAccessSettings = checkAppAccess(APP_ACCESS_TARGETS.PAGE_SETTINGS);

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

  const accessCtx = {
    role: user?.role,
    canAccess,
    currentTier,
    currentMode,
    hasIntelligence,
  };

  const specialtyNavItems = buildSpecialtyNavItems(clinicTypeRaw);
  const hospitalNavItems = buildHospitalNavItems(clinicType);

  const sectionsWithAccess: NavSection[] = navSections.map((section) => ({
    ...section,
    items: section.items.filter((item) => isItemAccessible(item, accessCtx)),
  }));

  const dynamicSection = buildDynamicSection(
    specialtyNavItems,
    hospitalNavItems,
    accessCtx,
  );

  const aiAssistantAccessible = isItemAccessible(AI_ASSISTANT_NAV_ITEM, accessCtx);

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
