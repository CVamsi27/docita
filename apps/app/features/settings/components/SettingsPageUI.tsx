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
            "grid items-start gap-x-3 gap-y-5 sm:gap-x-4",
            "grid-cols-[auto_minmax(0,1fr)]",
            "lg:[grid-template-columns:minmax(0,1fr)_fit-content(24rem)] lg:gap-x-10",
          )}
        >
          <div className="col-start-1 row-start-1 min-w-0 shrink-0">
            <BackButton fallback="/today" label="Back to Today" />
          </div>
          <div className="col-start-2 row-start-1 min-w-0 w-full max-w-md justify-self-end sm:max-w-lg lg:max-w-none">
            <SettingsExpandedSearch
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </div>
          <div className="col-span-2 min-w-0 lg:col-span-1 lg:col-start-1 lg:row-start-2">
            <PageHeader
              title="Settings"
              description="Manage your facility preferences and configurations."
              className="min-w-0"
            />
          </div>
          <div className="col-span-2 flex min-w-0 justify-start lg:col-span-1 lg:col-start-2 lg:row-start-2">
            <div className="w-fit max-w-full">
              <SettingsPageHeaderUserMeta />
            </div>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5 md:gap-6">
        <SettingsProfileHeader />
        <Tabs
          value={tabValue}
          onValueChange={onTabChange}
          className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8 lg:gap-10"
        >
          <SettingsPageTabNav filteredTabs={filteredTabs} />
          <SettingsPageTabPanels visibleTabValues={visibleTabValues} />
        </Tabs>
      </div>
    </AppPageScaffold>
  );
}
