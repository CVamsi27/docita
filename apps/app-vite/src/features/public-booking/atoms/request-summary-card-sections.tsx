"use client";

import { Calendar as CalendarIcon, CheckCircle2 } from "lucide-react";
import { CardTitle, MicroLabel } from "@workspace/ui/components";
import { formatDate } from "@workspace/utils";
import { cn } from "@workspace/ui/lib/utils";
import { formatTime } from "@/lib/formatters";

export interface RequestSummaryState {
  hasVisitSelection: boolean;
  scheduleComplete: boolean;
  anyFilled: boolean;
  compact: boolean;
}

export function buildRequestSummaryState(params: {
  selectedDoctorName: string | null;
  selectedCalendarDay: Date | undefined;
  selectedStart: string | null;
  selectedEnd: string | null;
  density: "default" | "compact";
}): RequestSummaryState {
  const scheduleComplete = Boolean(
    params.selectedCalendarDay && params.selectedStart && params.selectedEnd,
  );
  return {
    scheduleComplete,
    hasVisitSelection: Boolean(params.selectedDoctorName && scheduleComplete),
    anyFilled: Boolean(params.selectedDoctorName || params.selectedCalendarDay),
    compact: params.density === "compact",
  };
}

export function RequestSummaryHeader({
  state,
}: {
  state: RequestSummaryState;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-[var(--radius-md)] border transition-colors duration-200",
            state.compact ? "h-8 w-8" : "h-9 w-9",
            state.hasVisitSelection
              ? "border-success/25 bg-success/[0.1] text-success"
              : "border-border/60 bg-muted/30 text-muted-foreground",
          )}
        >
          <CalendarIcon
            className={state.compact ? "h-3.5 w-3.5" : "h-4 w-4"}
            strokeWidth={1.75}
          />
        </div>
        <div className="min-w-0 space-y-0.5">
          <MicroLabel
            as="h2"
            className={cn("mt-0", state.hasVisitSelection && "text-success/80")}
          >
            {state.hasVisitSelection ? "Ready to send" : "Your request"}
          </MicroLabel>
          <CardTitle
            className={cn(
              state.compact
                ? "text-[length:var(--fs-base)]"
                : "text-[length:var(--fs-base)] sm:text-[length:var(--fs-lg)]",
            )}
          >
            {resolveSummaryTitle(state)}
          </CardTitle>
        </div>
      </div>
      {state.hasVisitSelection && (
        <CheckCircle2
          className="h-5 w-5 shrink-0 text-success"
          strokeWidth={1.5}
          aria-hidden
        />
      )}
    </div>
  );
}

export function DoctorSummaryTile({
  selectedDoctorName,
  compact,
}: {
  selectedDoctorName: string | null;
  compact: boolean;
}) {
  return (
    <SummaryTile
      label="Doctor"
      value={selectedDoctorName ?? "Select a doctor"}
      active={Boolean(selectedDoctorName)}
      compact={compact}
    />
  );
}

export function ScheduleSummary({
  selectedCalendarDay,
  selectedStart,
  selectedEnd,
  state,
}: {
  selectedCalendarDay: Date | undefined;
  selectedStart: string | null;
  selectedEnd: string | null;
  state: RequestSummaryState;
}) {
  if (
    state.scheduleComplete &&
    selectedCalendarDay &&
    selectedStart &&
    selectedEnd
  ) {
    return (
      <SummaryTile
        label="Date & time"
        value={`${formatDate(selectedCalendarDay, "EEE d MMM")} · ${formatTime(
          selectedStart,
        )}-${formatTime(selectedEnd)}`}
        active
        compact={state.compact}
      />
    );
  }
  return (
    <div
      className={cn(
        "grid gap-2",
        state.compact ? "sm:grid-cols-2 sm:gap-2" : "gap-3 sm:grid-cols-2",
      )}
    >
      <SummaryTile
        label="Day"
        value={
          selectedCalendarDay
            ? formatDate(selectedCalendarDay, "EEE d MMM")
            : "Choose day"
        }
        active={Boolean(selectedCalendarDay)}
        compact={state.compact}
      />
      <SummaryTile
        label="Time"
        value={
          selectedStart && selectedEnd
            ? `${formatTime(selectedStart)} - ${formatTime(selectedEnd)}`
            : "Pick slot"
        }
        active={Boolean(selectedStart && selectedEnd)}
        compact={state.compact}
      />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  active,
  compact,
}: {
  label: string;
  value: string;
  active: boolean;
  compact: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border bg-card shadow-sm transition-colors duration-150",
        compact ? "p-2.5" : "p-3.5",
        active
          ? "border-primary/50 bg-primary/[0.06] shadow-md"
          : "border-border/70",
      )}
    >
      <MicroLabel as="p" className="mt-0">
        {label}
      </MicroLabel>
      <p
        className={cn(
          "mt-0.5 font-medium text-foreground",
          compact ? "text-[length:var(--fs-xs)]" : "text-[length:var(--fs-sm)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function resolveSummaryTitle(state: RequestSummaryState): string {
  if (state.hasVisitSelection) return "Visit summary";
  return state.anyFilled ? "In progress" : "Not started";
}
