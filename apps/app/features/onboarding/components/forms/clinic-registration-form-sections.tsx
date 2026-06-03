"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import {
  Alert,
  AlertDescription,
} from "@workspace/ui/components/feedback/alert";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { cn } from "@workspace/ui/lib/utils";
import { formatDateTime } from "@/lib/formatters";
import { STEPS, TOTAL_STEPS } from "./clinic-registration-form-helpers";

// ---------------------------------------------------------------------------
// DraftRestoreDialog
// ---------------------------------------------------------------------------

interface DraftRestoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  savedAt: string | undefined;
  onDiscard: () => void;
  onRestore: () => void;
}

export function DraftRestoreDialog({
  open,
  onOpenChange,
  savedAt,
  onDiscard,
  onRestore,
}: DraftRestoreDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Continue where you left off?</DialogTitle>
          <DialogDescription>
            A saved draft was found from{" "}
            {savedAt ? formatDateTime(savedAt) : "earlier"} and would you like
            to restore it?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onDiscard}>
            Start over
          </Button>
          <Button onClick={onRestore}>Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// OnboardingProgressCard
// ---------------------------------------------------------------------------

interface OnboardingProgressCardProps {
  step: number;
}

export function OnboardingProgressCard({ step }: OnboardingProgressCardProps) {
  const currentStep = STEPS.find((s) => s.number === step) ?? STEPS[0];
  const progressPercent = Math.round((step / TOTAL_STEPS) * 100);

  return (
    <div className="ui-card-surface p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <MicroLabel>Setup wizard</MicroLabel>
          <p className="text-base font-semibold text-foreground">
            Step {step} of {TOTAL_STEPS}: {currentStep?.label}
          </p>
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">
          ~{currentStep?.estimatedTime} remaining
        </p>
      </div>
      <div
        className="mt-3 flex items-center gap-2"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Onboarding progress: ${progressPercent}%`}
      >
        {STEPS.map((s) => (
          <span
            key={s.number}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              s.number < step
                ? "bg-primary"
                : s.number === step
                  ? "bg-primary/80"
                  : "bg-muted",
            )}
            aria-hidden
          />
        ))}
      </div>
      <div className="mt-2 hidden justify-between sm:flex">
        {STEPS.map((s) => (
          <span
            key={s.number}
            className={cn(
              "text-[var(--fs-2xs)] uppercase tracking-wide",
              s.number === step
                ? "font-semibold text-primary"
                : s.number < step
                  ? "text-muted-foreground"
                  : "text-muted-foreground/50",
            )}
          >
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// StepErrorAlert
// ---------------------------------------------------------------------------

interface StepErrorAlertProps {
  message: string | null;
  onDismiss: () => void;
}

export function StepErrorAlert({ message, onDismiss }: StepErrorAlertProps) {
  if (!message) return null;

  return (
    <>
      <Alert
        variant="destructive"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>{message}</span>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={onDismiss}
          >
            Dismiss
          </Button>
        </AlertDescription>
      </Alert>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {message ? `Error: ${message}` : ""}
      </div>
    </>
  );
}
