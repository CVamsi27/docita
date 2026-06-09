"use client";

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";

export function AppointmentsUpgradeFallback() {
  return (
    <AppPageScaffold>
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/70 bg-card/50 p-8 text-center min-h-[50vh]">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-border/70 bg-background/70">
          <CalendarDays className="h-7 w-7 text-primary" />
        </div>
        <h2 className="ui-section-title mb-2">Appointment Scheduling</h2>
        <p className="ui-page-subtitle mb-5 max-w-md">
          Manage patient appointments with an intuitive calendar. Upgrade to
          Core tier to unlock this feature.
        </p>
        <Button asChild>
          <Link href={SUBSCRIPTION_SETTINGS_PATH}>Upgrade to Core</Link>
        </Button>
      </div>
    </AppPageScaffold>
  );
}
