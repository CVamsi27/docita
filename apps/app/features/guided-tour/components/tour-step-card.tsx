"use client";

import { Button } from "@workspace/ui/components/form/button";
import type { TourStep } from "@/features/guided-tour/config/tour-steps";

export function TourStepCard({
  step,
  stepIndex,
  totalSteps,
  onNext,
  onBack,
  onSkip,
}: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={step.title}
      className="w-80 max-w-[calc(100vw-1.5rem)] rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg"
    >
      <p className="text-xs font-medium text-muted-foreground">
        Step {stepIndex + 1} of {totalSteps}
      </p>
      <h3 className="mt-1 text-base font-semibold">{step.title}</h3>
      <p aria-live="polite" className="mt-1.5 text-sm text-muted-foreground">
        {step.body}
      </p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Skip
        </Button>
        <div className="flex items-center gap-2">
          {!isFirst ? (
            <Button variant="outline" size="sm" onClick={onBack}>
              Back
            </Button>
          ) : null}
          <Button variant="primary" size="sm" onClick={onNext}>
            {isLast ? "Finish" : "Next"}
          </Button>
        </div>
      </div>
    </div>
  );
}
