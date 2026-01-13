"use client";

import { Suspense } from "react";
import { useSettingsLogic } from "@/features/settings/hooks/use-settings-logic";
import { SettingsPageUI } from "@/features/settings/components/SettingsPageUI";

function SettingsContent() {
  const { state, handlers } = useSettingsLogic();

  return (
    <SettingsPageUI
      filteredTabs={state.filteredTabs}
      searchQuery={state.searchQuery}
      setSearchQuery={handlers.setSearchQuery}
      defaultTab={state.defaultTab}
      firstMatchingTab={state.firstMatchingTab}
    />
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-6">Loading settings...</div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
