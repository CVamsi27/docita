import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { settingsTabs } from "@/features/settings/constants";
import { useAuth } from "@/lib/auth-context";
import { canAccessTarget } from "@/lib/access-policy";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { APP_ACCESS_TARGETS, type AppAccessTarget } from "@workspace/types";

const SETTINGS_TAB_ACCESS_TARGETS: Partial<Record<string, AppAccessTarget>> = {
  subscription: APP_ACCESS_TARGETS.PAGE_SETTINGS_SUBSCRIPTION,
  availability: APP_ACCESS_TARGETS.API_APPOINTMENTS,
  queue: APP_ACCESS_TARGETS.API_QUEUE,
  prescriptions: APP_ACCESS_TARGETS.PAGE_PRESCRIPTIONS,
  whatsapp: APP_ACCESS_TARGETS.API_WHATSAPP,
};

export const useSettingsLogic = () => {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const canAccessFeature = usePermissionStore((state) => state.canAccess);
  const canAccessTier = usePermissionStore((state) => state.canAccessTier);
  const requestedTab = searchParams.get("tab") || "general";
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTabs = useMemo(() => {
    const userRole = user?.role;
    const tabs = settingsTabs
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
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
  }, [canAccessFeature, canAccessTier, searchQuery, user]);

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
