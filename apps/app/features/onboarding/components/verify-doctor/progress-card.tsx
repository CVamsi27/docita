"use client";

import { FC } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import type { VerificationStep } from "./helpers";

interface ProgressCardProps {
  steps: VerificationStep[];
}

export const ProgressCard: FC<ProgressCardProps> = ({ steps }) => {
  const completedCount = steps.filter((s) => s.done).length;
  const requiredCount = steps.filter((s) => s.required).length;

  return (
    <div className="ui-card-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="ui-section-title text-[var(--fs-sm)]">
          Setup Progress
        </span>
        <span className="text-xs text-muted-foreground">
          {completedCount} of {requiredCount}
          <span className="ml-1">required</span>
        </span>
      </div>
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.label} className="flex items-start gap-3">
            {step.done ? (
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground/40 mt-0.5 shrink-0" />
            )}
            <div className="min-w-0">
              <p
                className={`text-sm font-medium ${step.done ? "text-primary" : ""}`}
              >
                {step.label}
                {step.required && !step.done && (
                  <span className="ml-1 text-xs font-normal text-destructive">
                    Required
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
