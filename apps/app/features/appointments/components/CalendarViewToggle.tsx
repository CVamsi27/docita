"use client";

import { Button } from "@workspace/ui/components/form/button";

interface CalendarViewToggleProps {
  view: "day" | "week";
  onChange: (view: "day" | "week") => void;
}

export function CalendarViewToggle({ view, onChange }: CalendarViewToggleProps) {
  return (
    <div className="flex w-fit items-center gap-0.5 rounded-[var(--radius-md)] border border-border/60 bg-muted/30 p-0.5">
      <Button
        size="sm"
        variant={view === "day" ? "default" : "ghost"}
        onClick={() => onChange("day")}
      >
        Day
      </Button>
      <Button
        size="sm"
        variant={view === "week" ? "default" : "ghost"}
        onClick={() => onChange("week")}
      >
        Week
      </Button>
    </div>
  );
}
