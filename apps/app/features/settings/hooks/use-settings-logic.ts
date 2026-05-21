import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { settingsTabs } from "@/features/settings/constants";
import { useAuth } from "@/lib/auth/auth-context";
import { canAccessTarget } from "@/lib/access-control/access-policy";
import { hasPermission, type Permission } from "@/lib/auth/permissions";
import { usePermissionStore } from "@/lib/stores/permission-store";
import {
  APP_ACCESS_TARGETS,
  Feature,
  Tier,
  type AppAccessTarget,
  type UserRole,
} from "@workspace/types";
import { getTierName, hasFeatureAccess } from "@workspace/utils";

const SETTINGS_TAB_ACCESS_TARGETS: Partial<Record<string, AppAccessTarget>> = {
  subscription: APP_ACCESS_TARGETS.PAGE_SETTINGS_SUBSCRIPTION,
  availability: APP_ACCESS_TARGETS.API_APPOINTMENTS,
  queue: APP_ACCESS_TARGETS.API_QUEUE,
  prescriptions: APP_ACCESS_TARGETS.PAGE_PRESCRIPTIONS,
  whatsapp: APP_ACCESS_TARGETS.API_WHATSAPP,
};

const SETTINGS_TAB_REQUIRED_PERMISSIONS: Partial<Record<string, Permission>> = {
  general: "manageClinic",
  members: "manageStaff",
  subscription: "manageBilling",
  queue: "manageClinic",
  prescriptions: "createPrescription",
  reminders: "manageClinic",
  whatsapp: "manageClinic",
  notifications: "manageClinic",
  security: "manageClinic",
};

const SETTINGS_TAB_MIN_TIERS: Partial<Record<string, Tier>> = {
  queue: Tier.ESSENTIAL,
};

interface VisibleSettingsTabsParams {
  userRole?: UserRole | null;
  currentTier: Tier;
  hasIntelligence?: boolean;
  canAccessFeature: (feature: Feature) => boolean;
  searchQuery?: string;
}

export function getVisibleSettingsTabs({
  userRole,
  currentTier,
  hasIntelligence = false,
  canAccessFeature,
  searchQuery = "",
}: VisibleSettingsTabsParams) {
  const tabs = settingsTabs
    .map((category) => ({
      ...category,
      items: category.items.filter((item) => {
        const requiredPermission = SETTINGS_TAB_REQUIRED_PERMISSIONS[item.value];
        if (requiredPermission) {
          if (!userRole || !hasPermission(userRole, requiredPermission)) {
            return false;
          }
        }

        const minTier = SETTINGS_TAB_MIN_TIERS[item.value];
        if (
          minTier !== undefined &&
          !hasFeatureAccess(
            getTierName(currentTier),
            Feature.QUEUE_MANAGEMENT,
            hasIntelligence,
          )
        ) {
          return false;
        }

        if ("feature" in item && item.feature) {
          if (!canAccessFeature(item.feature)) {
            return false;
          }
        }

        const accessTarget = SETTINGS_TAB_ACCESS_TARGETS[item.value];
        if (accessTarget) {
          return canAccessTarget(
            accessTarget,
            {
              role: userRole,
              canAccessFeature,
              currentTier,
              hasIntelligence,
            },
            "read",
          );
        }

        if (!("roles" in item) || !item.roles) return true;
        return (
          !!userRole &&
          item.roles.some((allowedRole) => allowedRole === userRole)
        );
      }),
    }))
    .filter((category) => category.items.length > 0);

  if (!searchQuery.trim()) return tabs;

  const query = searchQuery.toLowerCase();
  return tabs
    .map((category) => ({
      ...category,
      items: category.items.filter(
        (item) =>
          item.label.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query),
      ),
    }))
    .filter((category) => category.items.length > 0);
}

export const useSettingsLogic = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const canAccessFeature = usePermissionStore((state) => state.canAccess);
  const currentTier = usePermissionStore((state) => state.currentTier);
  const hasIntelligence = usePermissionStore((state) => state.hasIntelligence);
  const requestedTab = searchParams.get("tab") || "general";
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTabs = useMemo(() => {
    return getVisibleSettingsTabs({
      userRole: user?.role,
      currentTier,
      hasIntelligence,
      canAccessFeature,
      searchQuery,
    });
  }, [
    canAccessFeature,
    currentTier,
    hasIntelligence,
    searchQuery,
    user?.role,
  ]);

  const firstMatchingTab = filteredTabs[0]?.items[0]?.value;

  const allVisibleTabValues = filteredTabs.flatMap((c) => c.items.map((i) => i.value));
  const defaultTab = allVisibleTabValues.includes(requestedTab)
    ? requestedTab
    : (allVisibleTabValues[0] ?? "notifications");

  const tabValue =
    searchQuery.trim() && firstMatchingTab ? firstMatchingTab : defaultTab;

  const onTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", value);
      router.replace(`/settings?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  return {
    state: {
      filteredTabs,
      searchQuery,
      tabValue,
    },
    handlers: {
      setSearchQuery,
      onTabChange,
    },
  };
};
