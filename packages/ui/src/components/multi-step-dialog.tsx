"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";

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

/**
 * MultiStepDialog is a dialog for multi-step workflows (wizards).
 * Use this when you need to guide users through multiple sequential steps.
 *
 * @example
 * ```tsx
 * const [step, setStep] = useState(0);
 *
 * <MultiStepDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Create Account"
 *   steps={[
 *     { id: "personal", title: "Personal Info" },
 *     { id: "contact", title: "Contact Details" },
 *     { id: "verification", title: "Verify Email" }
 *   ]}
 *   currentStepIndex={step}
 *   onStepChange={setStep}
 *   onComplete={() => handleComplete()}
 * >
 *   {step === 0 && <PersonalInfoForm />}
 *   {step === 1 && <ContactDetailsForm />}
 *   {step === 2 && <VerificationForm />}
 * </MultiStepDialog>
 * ```
 */
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

  const isLoading_ = isLoading || isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {currentStep && currentStep.description && (
            <DialogDescription>{currentStep.description}</DialogDescription>
          )}

          {/* Step indicator */}
          <div className="mt-4 flex gap-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-2 flex-1">
                <button
                  type="button"
                  onClick={() => onStepChange(index)}
                  disabled={disabled || isLoading_}
                  className={`h-8 w-8 rounded-full text-xs font-medium transition-colors ${
                    index === currentStepIndex
                      ? "bg-primary text-primary-foreground"
                      : index < currentStepIndex
                        ? "bg-primary/30 text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index + 1}
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 transition-colors ${
                      index < currentStepIndex ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* Step content */}
        <div className="py-6">{children}</div>

        {/* Navigation buttons */}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => (isLastStep ? onOpenChange(false) : handlePrev())}
            disabled={isLoading_ || disabled}
            className="gap-2"
          >
            {isLastStep ? "Cancel" : prevLabel}
            {!isFirstStep && !isLastStep && <ChevronLeft className="h-4 w-4" />}
          </Button>

          {!isLastStep && (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isLoading_ || disabled}
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
              disabled={isLoading_ || disabled}
              className="gap-2"
            >
              {isLoading_ && <span className="animate-spin">⟳</span>}
              {completeLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
