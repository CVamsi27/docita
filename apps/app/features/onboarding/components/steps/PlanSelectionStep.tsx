"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Suspense } from "react";
import { PlanSelectionStepInner } from "./plan-selection-step-inner";

export interface PlanSelectionProps {
  onSelect: (
    tier: string,
    billingCycle: "MONTHLY" | "YEARLY",
    pricing: { monthly: number | "custom"; yearly: number | "custom" },
    options?: { currency?: string },
  ) => Promise<void>;
  defaultTier?: string;
  defaultBillingCycle?: "MONTHLY" | "YEARLY";
  currency?: string;
}

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
