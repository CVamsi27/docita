import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { settingsTabs } from "@/features/settings/constants";
import { useAuth } from "@/lib/auth-context";
import { canAccessTarget } from "@/lib/access-policy";
import { hasPermission, type Permission } from "@/lib/permissions";
import { usePermissionStore } from "@/lib/stores/permission-store";
import {
  APP_ACCESS_TARGETS,
  Tier,
  type AppAccessTarget,
} from "@workspace/types";

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

export const useSettingsLogic = () => {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const canAccessFeature = usePermissionStore((state) => state.canAccess);
  const canAccessTier = usePermissionStore((state) => state.canAccessTier);
  const currentTier = usePermissionStore((state) => state.currentTier);
  const requestedTab = searchParams.get("tab") || "general";
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTabs = useMemo(() => {
    const userRole = user?.role;
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
          if (minTier !== undefined && currentTier < minTier) {
            return false;
          }

          const accessTarget = SETTINGS_TAB_ACCESS_TARGETS[item.value];
          if (accessTarget) {
            return canAccessTarget(
              accessTarget,
              {
                role: user?.role,
                  canAccessFeature,
                  canAccessTier,
                },
                "read",
              );
          }

          if (!("roles" in item) || !item.roles) return true;
          return userRole && (item.roles as readonly string[]).includes(userRole);
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
  }, [canAccessFeature, canAccessTier, currentTier, searchQuery, user]);

  const firstMatchingTab = filteredTabs[0]?.items[0]?.value;

  const allVisibleTabValues = filteredTabs.flatMap((c) => c.items.map((i) => i.value));
  const defaultTab = allVisibleTabValues.includes(requestedTab)
    ? requestedTab
    : (allVisibleTabValues[0] ?? "notifications");

  return {
    state: {
      filteredTabs,
      searchQuery,
      defaultTab,
      firstMatchingTab,
    },
    handlers: {
      setSearchQuery,
    },
  };
};
