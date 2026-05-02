import type React from "react";

import { cn } from "@workspace/ui/lib/utils";

export interface StatTileProps {
  label: React.ReactNode;
  value: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: "default" | "info" | "success" | "warning" | "danger";
  className?: string;
  footer?: React.ReactNode;
}

const ACCENT: Record<NonNullable<StatTileProps["accent"]>, string> = {
  default: "bg-muted/40 text-foreground",
  info: "bg-info/10 text-info",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
};

export function StatTile({
  label,
  value,
  description,
  icon,
  accent = "default",
  className,
  footer,
}: StatTileProps) {
  const accentClass = ACCENT[accent];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-[var(--radius-lg)] border border-border/60 bg-card p-4",
        className,
      )}
    >
      {icon ? (
        <span
          aria-hidden
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)]",
            accentClass,
          )}
        >
          {icon}
        </span>
      ) : null}
      <div className="min-w-0 flex-1 space-y-1">
        <div className="text-[var(--fs-xs)] font-medium uppercase tracking-[var(--tracking-wide)] text-muted-foreground">
          {label}
        </div>
        <div className="text-[var(--fs-2xl)] font-semibold leading-[var(--lh-tight)] text-foreground tabular-nums">
          {value}
        </div>
        {description ? (
          <p className="ui-helper-text text-[var(--fs-xs)]">{description}</p>
        ) : null}
        {footer ? <div className="pt-2">{footer}</div> : null}
      </div>
    </div>
  );
}
