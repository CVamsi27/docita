"use client";

import { Pill } from "lucide-react";
import {
  AppPageScaffold,
  EmptyState
} from "@workspace/ui/components";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";

/**
 * `FeatureGate` fallback shown to clinics without digital-prescriptions
 * access — split out from `PrescriptionsPageContent` so the gated/ungated
 * branches are each easy to scan independently.
 */
export function PrescriptionsUpgradeFallback() {
  return (
    <AppPageScaffold>
      <EmptyState
        icon={Pill}
        title="Digital prescriptions"
        description="Create and manage digital prescriptions for your patients. Upgrade to Core tier to unlock this feature."
        action={{
          label: "Upgrade to Core",
          href: SUBSCRIPTION_SETTINGS_PATH,
        }}
        className="min-h-[50vh]"
      />
    </AppPageScaffold>
  );
}
