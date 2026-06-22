"use client";

import { X } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { useGuidedTour } from "./guided-tour-provider";
import { useChecklistSignals } from "@/features/guided-tour/hooks/use-checklist-signals";
import { CHECKLIST_ITEMS } from "@/features/guided-tour/config/checklist-items";
import { ChecklistItemRow } from "./checklist-item-row";

/**
 * Getting-started checklist for a newly-onboarded admin. Visibility is gated by
 * the feature flag + admin role + server dismissal; item completion is derived
 * from live data signals. Carries the `data-tour-id` the welcome tour targets.
 */
export function GettingStartedChecklist() {
  const { isChecklistVisible, dismissChecklist } = useGuidedTour();
  const { signals } = useChecklistSignals();

  if (!isChecklistVisible) return null;

  const doneCount = CHECKLIST_ITEMS.filter((item) => signals[item.id]).length;
  const total = CHECKLIST_ITEMS.length;

  return (
    <section
      data-tour-id="getting-started-checklist"
      aria-label="Getting started checklist"
      className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Getting started</h2>
          <p className="text-xs text-muted-foreground">
            {doneCount} of {total} complete
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Dismiss getting started checklist"
          onClick={dismissChecklist}
        >
          <X className="size-4" />
        </Button>
      </header>
      <ul className="mt-2 space-y-0.5">
        {CHECKLIST_ITEMS.map((item) => (
          <ChecklistItemRow
            key={item.id}
            item={item}
            done={Boolean(signals[item.id])}
          />
        ))}
      </ul>
    </section>
  );
}
