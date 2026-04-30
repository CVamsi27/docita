"use client";

import { Clock, Sparkles } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";

interface TrialOfferBannerProps {
  actionLabel?: string;
  className?: string;
  onAction?: () => void;
}

export function TrialOfferBanner({
  actionLabel = "Start 14-day trial",
  className,
  onAction,
}: TrialOfferBannerProps) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius)] border border-primary/25 bg-primary/5 p-4 text-sm",
        className,
      )}
      aria-label="14-day free trial"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/70 text-primary">
            <Clock className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              14-day free Essential trial is available
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            </p>
            <p className="text-muted-foreground">
              Start with Essential at no upfront cost. Add payment only when you
              are ready to continue after the trial.
            </p>
          </div>
        </div>
        {onAction && (
          <Button
            onClick={onAction}
            className="shrink-0 self-start md:self-auto"
          >
            {actionLabel}
          </Button>
        )}
      </div>
    </section>
  );
}
