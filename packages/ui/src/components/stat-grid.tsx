import type React from "react";

import { cn } from "@workspace/ui/lib/utils";
import { Skeleton } from "./skeleton";

export interface StatItem {
  id: string;
  label: React.ReactNode;
  value: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  accent?: "default" | "info" | "success" | "warning" | "danger";
}

interface StatGridProps {
  items: StatItem[];
  columns?: 2 | 3 | 4 | 5;
  isLoading?: boolean;
  className?: string;
}

const ACCENT: Record<NonNullable<StatItem["accent"]>, string> = {
  default: "bg-muted/40 text-foreground",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
};

const TREND: Record<NonNullable<StatItem["trend"]>["direction"], string> = {
  up: "text-success",
  down: "text-destructive",
  neutral: "text-muted-foreground",
};

export function StatGrid({
  items,
  columns = 4,
  isLoading = false,
  className,
}: StatGridProps) {
  return (
    <div
      className={cn(
        "grid gap-3",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        columns === 5 && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
        className,
      )}
    >
      {isLoading
        ? Array.from({ length: columns }).map((_, i) => (
            <div
              key={i}
              className="rounded-[var(--radius-lg)] border border-border/60 bg-card p-4"
            >
              <div className="flex items-start gap-3">
                <Skeleton
                  variant="circular"
                  className="h-9 w-9 shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          ))
        : items.map((item) => {
            const accent = ACCENT[item.accent ?? "default"];
            return (
              <div
                key={item.id}
                className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-border/60 bg-card p-4"
              >
                {item.icon ? (
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
                      accent,
                    )}
                  >
                    {item.icon}
                  </span>
                ) : null}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="text-[var(--fs-xs)] font-medium uppercase tracking-[var(--tracking-wide)] text-muted-foreground">
                    {item.label}
                  </div>
                  <div className="text-[var(--fs-2xl)] font-semibold leading-tight text-foreground">
                    {item.value}
                  </div>
                  {(item.description || item.trend) && (
                    <div className="flex flex-wrap items-center gap-1 text-[var(--fs-xs)] text-muted-foreground">
                      {item.trend ? (
                        <span className={cn("font-medium", TREND[item.trend.direction])}>
                          {item.trend.value}
                        </span>
                      ) : null}
                      {item.description}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
    </div>
  );
}
