"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Suspense } from "react";
import { PlanSelectionStepInner } from "./plan-selection-step-inner";
import type { PlanSelectionProps } from "./plan-selection-step.types";


export function PlanSelectionStep(props: PlanSelectionProps) {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-[240px] flex-col items-center justify-center gap-3 py-8"
          role="status"
          aria-live="polite"
          aria-label="Loading plan options"
        >
          <DocitaLoadingIndicator variant="section" withStatusRole={false} />
        </div>
      }
    >
      <PlanSelectionStepInner {...props} />
    </Suspense>
  );
}
