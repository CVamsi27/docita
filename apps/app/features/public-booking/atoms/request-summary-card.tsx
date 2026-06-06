"use client";

import {
  Card,
  CardContent,
  CardHeader,
} from "@workspace/ui/components/indicators/card";
import {
  bookingCardClass,
  bookingSectionHeaderBar,
  bookingSectionShell,
} from "./booking-constants";
import { cn } from "@workspace/ui/lib/utils";
import {
  buildRequestSummaryState,
  DoctorSummaryTile,
  RequestSummaryHeader,
  ScheduleSummary,
} from "./request-summary-card-sections";

export function RequestSummaryCard({
  selectedDoctorName,
  selectedCalendarDay,
  selectedStart,
  selectedEnd,
  className,
  density = "default",
}: {
  selectedDoctorName: string | null;
  selectedCalendarDay: Date | undefined;
  selectedStart: string | null;
  selectedEnd: string | null;
  className?: string;
  density?: "default" | "compact";
}) {
  const state = buildRequestSummaryState({
    selectedDoctorName,
    selectedCalendarDay,
    selectedStart,
    selectedEnd,
    density,
  });
  return (
    <Card
      className={cn(
        bookingCardClass,
        bookingSectionShell,
        "flex flex-col transition-shadow duration-200",
        state.hasVisitSelection && "shadow-md ring-1 ring-primary/15",
        className,
      )}
    >
      <CardHeader
        className={cn(
          bookingSectionHeaderBar,
          state.compact ? "py-3" : "py-3.5 sm:py-4",
          state.hasVisitSelection && "border-b-primary/20 bg-primary/[0.04]",
        )}
      >
        <RequestSummaryHeader state={state} />
      </CardHeader>
      <CardContent
        className={cn(
          "px-4",
          state.compact ? "space-y-2 py-3" : "space-y-3 py-4",
        )}
      >
        <DoctorSummaryTile
          selectedDoctorName={selectedDoctorName}
          compact={state.compact}
        />
        <ScheduleSummary
          selectedCalendarDay={selectedCalendarDay}
          selectedStart={selectedStart}
          selectedEnd={selectedEnd}
          state={state}
        />
      </CardContent>
    </Card>
  );
}
