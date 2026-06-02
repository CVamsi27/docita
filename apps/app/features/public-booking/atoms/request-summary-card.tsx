"use client";

import { Calendar as CalendarIcon, CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { formatDate } from "@workspace/utils";
import { formatTime } from "@/lib/formatters";
import {
  bookingCardClass,
  bookingSectionHeaderBar,
  bookingSectionShell,
} from "./booking-constants";
import { cn } from "@workspace/ui/lib/utils";

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
  const hasVisitSelection = Boolean(
    selectedDoctorName && selectedCalendarDay && selectedStart && selectedEnd,
  );
  const compact = density === "compact";
  const scheduleComplete = Boolean(
    selectedCalendarDay && selectedStart && selectedEnd,
  );
  const anyFilled = Boolean(selectedDoctorName || selectedCalendarDay);

  return (
    <Card
      className={cn(
        bookingCardClass,
        bookingSectionShell,
        "flex flex-col transition-shadow duration-200",
        hasVisitSelection && "shadow-md ring-1 ring-primary/15",
        className,
      )}
    >
      <CardHeader
        className={cn(
          bookingSectionHeaderBar,
          compact ? "py-3" : "py-3.5 sm:py-4",
          hasVisitSelection && "border-b-primary/20 bg-primary/[0.04]",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div
              className={cn(
                "flex shrink-0 items-center justify-center rounded-[var(--radius-md)] border transition-colors duration-200",
                compact ? "h-8 w-8" : "h-9 w-9",
                hasVisitSelection
                  ? "border-success/25 bg-success/[0.1] text-success"
                  : "border-border/60 bg-muted/30 text-muted-foreground",
              )}
            >
              <CalendarIcon
                className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
                strokeWidth={1.75}
              />
            </div>
            <div className="min-w-0 space-y-0.5">
              <MicroLabel
                as="h2"
                className={cn("mt-0", hasVisitSelection && "text-success/80")}
              >
                {hasVisitSelection ? "Ready to send" : "Your request"}
              </MicroLabel>
              <CardTitle
                className={cn(
                  compact
                    ? "text-[length:var(--fs-base)]"
                    : "text-[length:var(--fs-base)] sm:text-[length:var(--fs-lg)]",
                )}
              >
                {hasVisitSelection
                  ? "Visit summary"
                  : anyFilled
                    ? "In progress"
                    : "Not started"}
              </CardTitle>
            </div>
          </div>
          {hasVisitSelection && (
            <CheckCircle2
              className="h-5 w-5 shrink-0 text-success"
              strokeWidth={1.5}
              aria-hidden
            />
          )}
        </div>
      </CardHeader>
      <CardContent
        className={cn("px-4", compact ? "space-y-2 py-3" : "space-y-3 py-4")}
      >
        <div
          className={cn(
            "rounded-[var(--radius-md)] border border-border/70 bg-card shadow-sm transition-colors duration-150",
            compact ? "p-2.5" : "p-3.5",
            selectedDoctorName &&
              "border-primary/50 bg-primary/[0.06] shadow-md",
          )}
        >
          <MicroLabel as="p" className="mt-0">
            Doctor
          </MicroLabel>
          <p
            className={cn(
              "mt-0.5 font-medium text-foreground",
              compact
                ? "text-[length:var(--fs-xs)]"
                : "text-[length:var(--fs-sm)]",
            )}
          >
            {selectedDoctorName ?? "Select a doctor"}
          </p>
        </div>
        {scheduleComplete &&
        selectedCalendarDay &&
        selectedStart &&
        selectedEnd ? (
          <div
            className={cn(
              "rounded-[var(--radius-md)] border border-primary/50 bg-primary/[0.06] shadow-md transition-colors duration-150",
              compact ? "p-2.5" : "p-3.5",
            )}
          >
            <MicroLabel as="p" className="mt-0">
              Date &amp; time
            </MicroLabel>
            <p
              className={cn(
                "mt-0.5 font-medium text-foreground",
                compact
                  ? "text-[length:var(--fs-xs)]"
                  : "text-[length:var(--fs-sm)]",
              )}
            >
              {formatDate(selectedCalendarDay, "EEE d MMM")} &middot;{" "}
              {formatTime(selectedStart)}–{formatTime(selectedEnd)}
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "grid gap-2",
              compact ? "sm:grid-cols-2 sm:gap-2" : "gap-3 sm:grid-cols-2",
            )}
          >
            <div
              className={cn(
                "rounded-[var(--radius-md)] border border-border/70 bg-card shadow-sm transition-colors duration-150",
                compact ? "p-2.5" : "p-3.5",
                selectedCalendarDay &&
                  "border-primary/50 bg-primary/[0.06] shadow-md",
              )}
            >
              <MicroLabel as="p" className="mt-0">
                Day
              </MicroLabel>
              <p
                className={cn(
                  "mt-0.5 font-medium text-foreground",
                  compact
                    ? "text-[length:var(--fs-xs)]"
                    : "text-[length:var(--fs-sm)]",
                )}
              >
                {selectedCalendarDay
                  ? formatDate(selectedCalendarDay, "EEE d MMM")
                  : "Choose day"}
              </p>
            </div>
            <div
              className={cn(
                "rounded-[var(--radius-md)] border border-border/70 bg-card shadow-sm transition-colors duration-150",
                compact ? "p-2.5" : "p-3.5",
                selectedStart &&
                  selectedEnd &&
                  "border-primary/50 bg-primary/[0.06] shadow-md",
              )}
            >
              <MicroLabel as="p" className="mt-0">
                Time
              </MicroLabel>
              <p
                className={cn(
                  "mt-0.5 font-medium text-foreground",
                  compact
                    ? "text-[length:var(--fs-xs)]"
                    : "text-[length:var(--fs-sm)]",
                )}
              >
                {selectedStart && selectedEnd
                  ? `${formatTime(selectedStart)} - ${formatTime(selectedEnd)}`
                  : "Pick slot"}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
