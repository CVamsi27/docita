import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { settingsTabs } from "../constants";
import { useAuth } from "@/lib/auth-context";

export const useSettingsLogic = () => {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const defaultTab = searchParams.get("tab") || "general";
  const [searchQuery, setSearchQuery] = useState("");

  // Filter tabs based on search query and user role
  const filteredTabs = useMemo(() => {
    let tabs = settingsTabs;

    // DOCTOR / RECEPTIONIST cannot manage Practice-level settings
    if (user?.role === "DOCTOR" || user?.role === "RECEPTIONIST") {
      tabs = tabs.filter((category) => category.category !== "Practice");
    }

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
  }, [searchQuery, user]);

  // Find the first matching tab when searching
  const firstMatchingTab = filteredTabs[0]?.items[0]?.value;

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
