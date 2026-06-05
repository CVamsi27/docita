"use client";

import { cn } from "@workspace/ui/lib/utils";
import { getStatusColor } from "@workspace/ui/components/indicators/status-badge";
import type { AppointmentSummary } from "@/features/appointments/lib/appointments-page-helpers";

interface AppointmentSummaryBarProps {
  summary: AppointmentSummary;
}

export function AppointmentSummaryBar({ summary }: AppointmentSummaryBarProps) {
  if (summary.total === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-border/60 bg-background/60 px-3 py-2 text-xs">
      <span className="font-semibold text-foreground">
        {summary.total} appointment
        {summary.total !== 1 ? "s" : ""}
      </span>
      {summary.breakdown.length > 0 ? (
        <span
          className="hidden text-muted-foreground sm:inline"
          aria-hidden
        >
          ·
        </span>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {summary.breakdown.map((item) => (
          <span
            key={item.label}
            className="inline-flex items-center gap-1.5 text-muted-foreground"
          >
            <span
              className={cn(
                "inline-flex h-1.5 w-1.5 shrink-0 rounded-full",
                getStatusColor(item.status),
              )}
              aria-hidden
            />
            <span>
              {item.label}{" "}
              <span className="font-medium tabular-nums text-foreground">
                {item.value}
              </span>
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
