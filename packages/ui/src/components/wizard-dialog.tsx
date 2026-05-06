"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./dialog";
import { Button } from "./button";
import { MicroLabel } from "./micro-label";

export interface WizardDialogStepDescriptor {
  id: string;
  label?: string;
}

export interface WizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** All-caps category prefix shown above the title. */
  category?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  steps: WizardDialogStepDescriptor[];
  activeStepId: string;
  onBack?: () => void;
  /** Called when the dialog closes for any reason (back-arrow does not fire this). */
  className?: string;
  contentClassName?: string;
  children: React.ReactNode;
  /** Footer rendered inside the dialog body. */
  footer?: React.ReactNode;
}

/**
 * Origin-style multi-step modal: small, centered, with back-arrow on multi-step,
 * step pips at the bottom, and `MicroLabel` category prefix.
 */
export function WizardDialog({
  open,
  onOpenChange,
  category,
  title,
  description,
  steps,
  activeStepId,
  onBack,
  className,
  contentClassName,
  children,
  footer,
}: WizardDialogProps) {
  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === activeStepId),
  );
  const showBack = onBack && activeIndex > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        {...(description ? {} : { "aria-describedby": undefined })}
        className={cn(
          "sm:max-w-[480px] gap-4 p-0 overflow-hidden",
          contentClassName,
        )}
      >
        <DialogHeader className={cn("gap-2 px-6 pt-6", className)}>
          <div className="flex items-center justify-between">
            {showBack ? (
              <Button
                variant="ghost"
                size="icon"
                className="-ml-2 size-8 text-muted-foreground"
                aria-label="Previous step"
                type="button"
                onClick={onBack}
              >
                <ArrowLeft className="size-4" />
              </Button>
            ) : (
              <span aria-hidden className="size-8" />
            )}
            {category ? (
              <MicroLabel className="text-center">{category}</MicroLabel>
            ) : (
              <span aria-hidden />
            )}
            <span aria-hidden className="size-8" />
          </div>
          <DialogTitle className="text-center text-lg font-semibold tracking-tight">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription className="text-center text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="px-6 pb-6">{children}</div>
        {footer ? (
          <div className="border-t border-border/60 bg-muted/30 px-6 py-4">
            {footer}
          </div>
        ) : null}
        {steps.length > 1 ? (
          <ol
            aria-label={`Step ${activeIndex + 1} of ${steps.length}`}
            className="flex items-center justify-center gap-1.5 pb-4"
          >
            {steps.map((step, index) => {
              const isActive = step.id === activeStepId;
              const isComplete = index < activeIndex;
              return (
                <li
                  key={step.id}
                  aria-current={isActive ? "step" : undefined}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    isActive
                      ? "w-6 bg-foreground"
                      : isComplete
                        ? "w-1.5 bg-foreground/60"
                        : "w-1.5 bg-border",
                  )}
                />
              );
            })}
          </ol>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
