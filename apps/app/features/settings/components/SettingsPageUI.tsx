"use client";

import { BackButton } from "@/components/navigation/back-button";
import { AppPageScaffold, Tabs } from "@workspace/ui/components";
import { useTranslations } from "next-intl";
import { SettingsPageHeaderUserMeta, SettingsProfileHeader } from "./profile/SettingsProfileHeader";
import { SettingsExpandedSearch } from "./settings-expanded-search";
import { SettingsPageTabNav, type SettingsCategory } from "./settings-page-tab-nav";
import { SettingsPageTabPanels } from "./settings-page-tab-panels";

export type {
  SettingsCategory,
  SettingsTabItem,
} from "./settings-page-tab-nav";

interface SettingsPageUIProps {
  filteredTabs: SettingsCategory[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  tabValue: string;
  onTabChange: (value: string) => void;
}

export function SettingsPageUI({
  filteredTabs,
  searchQuery,
  setSearchQuery,
  tabValue,
  onTabChange,
}: SettingsPageUIProps) {
  const t = useTranslations("Settings.page");
  const visibleTabValues = new Set(
    filteredTabs.flatMap((category) =>
      category.items.map((item) => item.value),
    ),
  );

  return (
    <AppPageScaffold
      className="pb-24"
      header={
        <div className="flex min-w-0 flex-col gap-4">
          <div className="hidden md:block">
            <BackButton fallback="/today" label={t("backToToday")} />
          </div>
          <div className="grid min-w-0 grid-cols-1 items-end gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="ui-eyebrow">{t("workspaceEyebrow")}</span>
              <h1 className="ui-page-title">{t("pageTitle")}</h1>
              <p className="ui-page-subtitle max-w-xl">
                {t("pageSubtitle")}
              </p>
            </div>
            <SettingsPageHeaderUserMeta />
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <SettingsProfileHeader />
        <Tabs
          value={tabValue}
          onValueChange={onTabChange}
          className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-[13.75rem_minmax(0,1fr)] md:gap-10 lg:grid-cols-[14.5rem_minmax(0,1fr)]"
        >
          <aside className="flex min-w-0 flex-col gap-3 md:sticky md:top-4 md:self-start">
            <SettingsExpandedSearch
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
            <SettingsPageTabNav filteredTabs={filteredTabs} />
          </aside>
          <SettingsPageTabPanels visibleTabValues={visibleTabValues} />
        </Tabs>
      </div>
    </AppPageScaffold>
  );
}
