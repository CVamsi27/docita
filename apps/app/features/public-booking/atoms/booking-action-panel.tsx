"use client";

import { ShieldCheck } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent } from "@workspace/ui/components/card";
import { bookingCardClass, bookingSectionShell } from "./booking-constants";
import { cn } from "@workspace/ui/lib/utils";

export function BookingActionPanel({
  onSubmit,
  isSubmitting,
  className,
  variant = "default",
  submitEnabled = true,
}: {
  onSubmit: () => void;
  isSubmitting: boolean;
  className?: string;
  variant?: "default" | "compact";
  /** When false, submit stays disabled (matches validation before sending). */
  submitEnabled?: boolean;
}) {
  const isCompact = variant === "compact";
  const submitBlocked = isSubmitting || !submitEnabled;
  return (
    <Card
      className={cn(
        bookingCardClass,
        !isCompact && bookingSectionShell,
        className,
      )}
    >
      <CardContent
        className={cn(
          isCompact ? "space-y-2.5 py-3 sm:py-3.5" : "space-y-3 py-4 sm:py-5",
        )}
      >
        <Button
          type="button"
          className={cn(
            "w-full rounded-[var(--radius-md)] px-6 font-semibold shadow-sm",
            isCompact
              ? "h-11 text-[length:var(--fs-sm)]"
              : "h-12 text-[length:var(--fs-base)]",
          )}
          onClick={onSubmit}
          disabled={submitBlocked}
        >
          {isSubmitting ? "Sending…" : "Send visit request"}
        </Button>
        <div className="flex items-start gap-2">
          <ShieldCheck
            className={cn(
              "mt-0.5 shrink-0 text-primary/60",
              isCompact ? "h-3 w-3" : "h-3.5 w-3.5",
            )}
            aria-hidden
          />
          <p
            className={cn(
              "leading-snug text-muted-foreground",
              isCompact
                ? "text-[length:var(--fs-2xs)]"
                : "text-[length:var(--fs-xs)]",
            )}
          >
            Submitting sends a request only — the care team confirms before it
            is a firm appointment.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
