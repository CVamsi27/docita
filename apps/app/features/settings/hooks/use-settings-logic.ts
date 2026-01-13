import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { settingsTabs } from "../constants";

export const useSettingsLogic = () => {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "general";
  const [searchQuery, setSearchQuery] = useState("");

  // Filter tabs based on search query
  const filteredTabs = useMemo(() => {
    if (!searchQuery.trim()) return settingsTabs;

    const query = searchQuery.toLowerCase();
    return settingsTabs
      .map((category) => ({
        ...category,
        items: category.items.filter(
          (item) =>
            item.label.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query),
        ),
      }))
      .filter((category) => category.items.length > 0);
  }, [searchQuery]);

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
