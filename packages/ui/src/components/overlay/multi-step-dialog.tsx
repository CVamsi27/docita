"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { DocitaLoadingIndicator } from "../feedback/docita-loading-indicator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "../form/button";
import { cn } from "@workspace/ui/lib/utils";

export interface Step {
  id: string;
  title: string;
  description?: string;
}

export interface MultiStepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  steps: Step[];
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  onComplete: () => void | Promise<void>;
  children: React.ReactNode;
  nextLabel?: string;
  prevLabel?: string;
  completeLabel?: string;
  isLoading?: boolean;
  disabled?: boolean;
  allowSkip?: boolean;
}

export function MultiStepDialog({
  open,
  onOpenChange,
  title,
  steps,
  currentStepIndex,
  onStepChange,
  onComplete,
  children,
  nextLabel = "Next",
  prevLabel = "Previous",
  completeLabel = "Complete",
  isLoading = false,
  disabled = false,
}: MultiStepDialogProps) {
  const [isPending, setIsPending] = React.useState(false);
  const currentStep = steps[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      onStepChange(currentStepIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      onStepChange(currentStepIndex - 1);
    }
  };

  const handleComplete = async () => {
    setIsPending(true);
    try {
      await onComplete();
      onOpenChange(false);
    } finally {
      setIsPending(false);
    }
  };

  const busy = isLoading || isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {currentStep && currentStep.description && (
            <DialogDescription>{currentStep.description}</DialogDescription>
          )}

          <div
            role="list"
            aria-label="Steps"
            className="mt-4 flex items-center gap-2"
          >
            {steps.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              return (
                <div
                  key={step.id}
                  role="listitem"
                  className="flex items-center gap-2 flex-1"
                >
                  <button
                    type="button"
                    onClick={() => onStepChange(index)}
                    disabled={disabled || busy}
                    aria-current={isActive ? "step" : undefined}
                    aria-label={`Step ${index + 1}: ${step.title}`}
                    className={cn(
                      "inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      "disabled:opacity-60 disabled:cursor-not-allowed",
                      isActive && "bg-primary text-primary-foreground",
                      isCompleted && "bg-primary/20 text-primary",
                      !isActive &&
                        !isCompleted &&
                        "bg-muted text-muted-foreground",
                    )}
                  >
                    {index + 1}
                  </button>
                  {index < steps.length - 1 && (
                    <div
                      aria-hidden="true"
                      className={cn(
                        "h-0.5 flex-1 rounded-full transition-colors",
                        index < currentStepIndex ? "bg-primary" : "bg-muted",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </DialogHeader>

        <div className="py-2">{children}</div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => (isLastStep ? onOpenChange(false) : handlePrev())}
            disabled={busy || disabled}
            className="gap-2"
          >
            {!isFirstStep && !isLastStep && <ChevronLeft className="h-4 w-4" />}
            {isLastStep ? "Cancel" : prevLabel}
          </Button>

          {!isLastStep && (
            <Button
              type="button"
              onClick={handleNext}
              disabled={busy || disabled}
              className="gap-2"
            >
              {nextLabel}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}

          {isLastStep && (
            <Button
              type="button"
              onClick={handleComplete}
              disabled={busy || disabled}
              className="gap-2"
            >
              {busy ? (
                <DocitaLoadingIndicator variant="inline" decorative />
              ) : null}
              {completeLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
