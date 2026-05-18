import type React from "react";

import { cn } from "@workspace/ui/lib/utils";

export interface TimelineItem {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: "default" | "info" | "success" | "warning" | "danger";
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

const ACCENT: Record<NonNullable<TimelineItem["accent"]>, string> = {
  default: "bg-muted text-muted-foreground",
  info: "bg-info/15 text-info",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
};

export function Timeline({ items, className }: TimelineProps) {
  return (
    <ol className={cn("relative space-y-4", className)}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        const accent = ACCENT[item.accent ?? "default"];
        return (
          <li key={item.id} className="relative flex gap-3">
            <div className="flex flex-col items-center">
              <span
                aria-hidden
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-background",
                  accent,
                )}
              >
                {item.icon ?? <span className="size-2 rounded-full bg-current" />}
              </span>
              {!isLast ? (
                <span aria-hidden className="flex-1 w-px bg-border/70 mt-1" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 pb-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="text-[var(--fs-sm)] font-medium text-foreground min-w-0">
                  {item.title}
                </div>
                {item.meta ? (
                  <div className="text-[var(--fs-xs)] text-muted-foreground">{item.meta}</div>
                ) : null}
              </div>
              {item.description ? (
                <div className="mt-0.5 text-[var(--fs-sm)] text-muted-foreground">
                  {item.description}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
