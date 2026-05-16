"use client";

import { ChevronDown } from "lucide-react";
import { Badge } from "@workspace/ui/components/badge";
import { Progress } from "@workspace/ui/components/progress";
import { MicroLabel } from "@workspace/ui/components/micro-label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet";
import { cn } from "@workspace/ui/lib/utils";
import { formatDate } from "@workspace/utils";
import { formatTime } from "@/lib/formatters";
import {
  PUBLIC_BOOKING_MOBILE_WIZARD_HEADER_STICKY_CLASS,
} from "@/features/public-booking/public-booking-constants";
import { PublicBookingTrustRow } from "./public-booking-trust-row";
import { PublicBookingHowItWorksSheet, RequestSummaryCard } from "@/features/public-booking/public-booking-components";

/** Desktop hero card: gradient banner with clinic name, badges, and trust indicators. */
export function PublicBookingHeroCompact({
  clinicName,
  facilityLabel,
}: {
  clinicName: string;
  facilityLabel: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-border/50 bg-card shadow-sm">
      {/* Accent bar */}
      <div
        className="h-1 w-full bg-gradient-to-r from-primary/50 via-primary to-primary/50"
        aria-hidden
      />
      {/* Background tint */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.045] via-transparent to-transparent"
        aria-hidden
      />
      <div className="relative grid grid-cols-[1fr_auto] items-start gap-x-8 gap-y-4 px-7 py-6 lg:px-8 lg:py-7">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.08] px-2.5 py-0.5 text-[length:var(--fs-2xs)] font-semibold tracking-wide text-primary">
              Online booking
            </span>
            <Badge
              variant="secondary"
              className="normal-case text-[length:var(--fs-2xs)] font-medium"
            >
              {facilityLabel}
            </Badge>
          </div>
          <h1 className="font-serif text-[length:var(--fs-3xl)] font-semibold leading-tight tracking-tight text-foreground">
            {clinicName}
          </h1>
          <p className="flex flex-wrap items-center gap-2 text-[length:var(--fs-sm)] leading-relaxed text-muted-foreground">
            <span>
              Fill in the steps below to request a visit. Staff confirm before it&apos;s final.
            </span>
            <PublicBookingHowItWorksSheet appearance="inline" />
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5 pt-0.5">
          <PublicBookingTrustRow className="flex-col items-end gap-x-0 gap-y-1.5" />
        </div>
      </div>
    </div>
  );
}

/** Slim sticky wizard chrome: clinic strip + progress (mobile). */
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

export function PublicBookingSummaryPeek({
  selectedDoctorName,
  selectedCalendarDay,
  selectedStart,
  selectedEnd,
}: {
  selectedDoctorName: string | null;
  selectedCalendarDay: Date | undefined;
  selectedStart: string | null;
  selectedEnd: string | null;
}) {
  const hasSlot = Boolean(selectedCalendarDay && selectedStart && selectedEnd);
  const hasAll = Boolean(selectedDoctorName) && hasSlot;
  const hasAny = Boolean(selectedDoctorName) || hasSlot;

  const line = hasAll
    ? `${selectedDoctorName} · ${formatDate(selectedCalendarDay!, "EEE d MMM")} · ${formatTime(selectedStart!)}–${formatTime(selectedEnd!)}`
    : hasSlot
      ? `${formatDate(selectedCalendarDay!, "EEE d MMM")} · ${formatTime(selectedStart!)}–${formatTime(selectedEnd!)}`
      : selectedDoctorName
        ? selectedDoctorName
        : null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full min-w-0 items-center justify-between gap-2 rounded-[var(--radius-md)] border px-2.5 py-2 text-left shadow-sm transition-colors duration-150 touch-manipulation sm:px-3 sm:py-2",
            hasAny
              ? "border-primary/40 bg-primary/[0.06] hover:bg-primary/[0.09]"
              : "border-border/70 bg-muted/25 hover:bg-muted/40",
          )}
          aria-label="Your request summary"
        >
          <span className="min-w-0 flex-1">
            <MicroLabel
              as="span"
              className={cn(
                "mt-0 block text-[length:var(--fs-2xs)] font-medium",
                hasAny ? "text-primary/80" : "text-muted-foreground",
              )}
            >
              Your visit
            </MicroLabel>
            <span className={cn(
              "block truncate text-[length:var(--fs-xs)] font-medium leading-snug sm:text-[length:var(--fs-sm)]",
              hasAny ? "text-foreground" : "text-muted-foreground/80",
            )}>
              {line ?? "No day or slot selected yet"}
            </span>
          </span>
          <ChevronDown className={cn(
            "size-3.5 shrink-0 sm:size-4",
            hasAny ? "text-primary/70" : "text-muted-foreground",
          )} aria-hidden />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="gap-0 px-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader className="border-b border-border/50 px-4 pb-3 pt-2 text-left sm:px-6">
          <SheetTitle className="text-left text-[length:var(--fs-lg)]">Your request</SheetTitle>
          <SheetDescription className="text-left text-[length:var(--fs-xs)]">
            Doctor, day, and time for this visit request.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 py-4 sm:px-6">
          <RequestSummaryCard
            selectedDoctorName={selectedDoctorName}
            selectedCalendarDay={selectedCalendarDay}
            selectedStart={selectedStart}
            selectedEnd={selectedEnd}
            density="compact"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
