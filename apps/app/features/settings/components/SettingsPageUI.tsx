"use client";

import { cn } from "@workspace/ui/lib/utils";
import { BackButton } from "@/components/navigation/back-button";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { Tabs } from "@workspace/ui/components/navigation/tabs";
import {
  SettingsPageHeaderUserMeta,
  SettingsProfileHeader,
} from "./profile/SettingsProfileHeader";
import { SettingsExpandedSearch } from "./settings-expanded-search";
import {
  SettingsPageTabNav,
  type SettingsCategory,
} from "./settings-page-tab-nav";
import { SettingsPageTabPanels } from "./settings-page-tab-panels";

export type { SettingsCategory, SettingsTabItem } from "./settings-page-tab-nav";

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
  const visibleTabValues = new Set(
    filteredTabs.flatMap((category) => category.items.map((item) => item.value)),
  );

  return (
    <AppPageScaffold
      className="pb-24"
      header={
        <div
          className={cn(
            "grid min-w-0 items-start gap-y-4",
            "grid-cols-1 md:grid-cols-[auto_minmax(0,1fr)] md:gap-x-4",
            "lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-x-10",
          )}
        >
          <div className="hidden min-w-0 shrink-0 md:col-start-1 md:row-start-1 md:block">
            <BackButton fallback="/today" label="Back to Today" />
          </div>
          <div className="min-w-0 w-full md:col-start-2 md:row-start-1 lg:max-w-none">
            <SettingsExpandedSearch
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </div>
          <div className="min-w-0 md:col-span-2 lg:col-span-1 lg:col-start-1 lg:row-start-2">
            <PageHeader
              title="Settings"
              description="Manage your facility preferences and configurations."
              className="min-w-0"
            />
          </div>
          <div className="flex min-w-0 w-full justify-stretch md:col-span-2 lg:col-span-1 lg:col-start-2 lg:row-start-2 lg:justify-end">
            <SettingsPageHeaderUserMeta />
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5 md:gap-6">
        <SettingsProfileHeader />
        <Tabs
          value={tabValue}
          onValueChange={onTabChange}
          className="flex min-w-0 flex-col gap-6 md:flex-row md:items-start md:gap-8 lg:gap-10"
        >
          <SettingsPageTabNav filteredTabs={filteredTabs} />
          <SettingsPageTabPanels visibleTabValues={visibleTabValues} />
        </Tabs>
      </div>
    </AppPageScaffold>
  );
}
