"use client";

import { AlertCircle } from "lucide-react";
import { sanitizeUserFacingMessage } from "@workspace/types";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  message = "We could not load this section. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  const safeMessage = sanitizeUserFacingMessage(
    message,
    "We could not load this section. Please try again.",
  );

  return (
    <div
      className={cn(
        "ui-section-stack py-12 text-center text-muted-foreground",
        className,
      )}
      role="alert"
    >
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <p className="ui-section-title text-foreground">{safeMessage}</p>
      {onRetry && (
        <Button variant="outline" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
