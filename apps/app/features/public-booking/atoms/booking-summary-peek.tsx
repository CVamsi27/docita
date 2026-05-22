"use client";

import { ChevronDown } from "lucide-react";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/overlay/sheet";
import { formatDate } from "@workspace/utils";
import { formatTime } from "@/lib/formatters";
import { RequestSummaryCard } from "./request-summary-card";
import { cn } from "@workspace/ui/lib/utils";

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
  const calendarDay = selectedCalendarDay;
  const slotStart = selectedStart;
  const slotEnd = selectedEnd;

  const line =
    hasAll && calendarDay && slotStart && slotEnd
      ? `${selectedDoctorName} · ${formatDate(calendarDay, "EEE d MMM")} · ${formatTime(slotStart)}–${formatTime(slotEnd)}`
      : hasSlot && calendarDay && slotStart && slotEnd
        ? `${formatDate(calendarDay, "EEE d MMM")} · ${formatTime(slotStart)}–${formatTime(slotEnd)}`
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
            <span
              className={cn(
                "block truncate text-[length:var(--fs-xs)] font-medium leading-snug sm:text-[length:var(--fs-sm)]",
                hasAny ? "text-foreground" : "text-muted-foreground/80",
              )}
            >
              {line ?? "No day or slot selected yet"}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 sm:size-4",
              hasAny ? "text-primary/70" : "text-muted-foreground",
            )}
            aria-hidden
          />
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="gap-0 px-0 pb-[max(1rem,env(safe-area-inset-bottom))]"
      >
        <SheetHeader className="border-b border-border/50 px-4 pb-3 pt-2 text-left sm:px-6">
          <SheetTitle className="text-left text-[length:var(--fs-lg)]">
            Your request
          </SheetTitle>
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
