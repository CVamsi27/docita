"use client";

import { Progress } from "@workspace/ui/components/feedback/progress";
import { PUBLIC_BOOKING_MOBILE_WIZARD_HEADER_STICKY_CLASS } from "@/features/public-booking/public-booking-constants";
import { cn } from "@workspace/ui/lib/utils";

export function PublicBookingProgressChrome({
  clinicName,
  facilityWord,
  stepIndex,
  stepCount,
}: {
  clinicName: string;
  facilityWord: string;
  stepIndex: number;
  stepCount: number;
}) {
  const pct = Math.round(((stepIndex + 1) / stepCount) * 100);
  return (
    <header
      className={cn(
        PUBLIC_BOOKING_MOBILE_WIZARD_HEADER_STICKY_CLASS,
        "z-20 mx-0 overflow-hidden rounded-b-[var(--radius-lg)] border-x border-b border-border/50 border-t border-t-primary/20 bg-card/98 px-3 pb-2.5 pt-2 shadow-xs ring-1 ring-border/25 supports-[backdrop-filter]:backdrop-blur-md sm:mx-1 sm:px-4 sm:pb-3 sm:pt-2.5",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-primary/[0.06] to-transparent"
      />
      <div className="relative flex min-h-9 min-w-0 items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-serif text-[length:var(--fs-base)] font-semibold leading-snug tracking-tight text-foreground sm:text-[length:var(--fs-lg)]">
            {clinicName}
          </h1>
          <p className="text-[length:var(--fs-2xs)] leading-none text-muted-foreground sm:text-[length:var(--fs-xs)]">
            {facilityWord}
          </p>
        </div>
        <div
          className="flex shrink-0 items-center gap-1.5"
          aria-label={`Step ${stepIndex + 1} of ${stepCount}`}
        >
          {Array.from({ length: stepCount }).map((_, i) => (
            <div
              key={i}
              aria-hidden
              className={cn(
                "rounded-full transition-[width,height] duration-300",
                i < stepIndex
                  ? "h-2 w-2 bg-primary/60"
                  : i === stepIndex
                    ? "h-2 w-5 bg-primary sm:w-6"
                    : "h-2 w-2 bg-border",
              )}
            />
          ))}
        </div>
      </div>
      <Progress
        value={pct}
        className="relative mt-2.5 h-1.5 w-full overflow-hidden rounded-full"
        aria-label={`Booking progress: step ${stepIndex + 1} of ${stepCount}`}
      />
    </header>
  );
}
