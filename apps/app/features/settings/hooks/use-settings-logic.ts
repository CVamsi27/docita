import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { settingsTabs } from "../constants";
import { useAuth } from "@/lib/auth-context";

export const useSettingsLogic = () => {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const defaultTab =
    searchParams.get("tab") ||
    (user?.role === "SUPER_ADMIN" ? "security" : "general");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter tabs based on search query and user role
  const filteredTabs = useMemo(() => {
    let tabs = settingsTabs;

    // SUPER_ADMIN Restriction: Can only see Security and Notifications
    if (user?.role === "SUPER_ADMIN") {
      tabs = tabs
        .map((category) => ({
          ...category,
          items: category.items.filter((item) =>
            ["security", "notifications"].includes(item.value),
          ),
        }))
        .filter((category) => category.items.length > 0);
    }
    // Filter by role for standard clinic roles
    else if (user?.role === "DOCTOR" || user?.role === "RECEPTIONIST") {
      // Exclude "Practice" category (Admin only)
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
