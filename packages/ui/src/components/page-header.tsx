import type React from "react";

import { cn } from "@workspace/ui/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  tabs?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  tabs,
  eyebrow,
  className,
  sticky = false,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3",
        sticky &&
          "sticky top-0 z-20 -mx-4 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6",
        className,
      )}
    >
      {breadcrumbs ? <div className="min-w-0">{breadcrumbs}</div> : null}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-1">
          {eyebrow ? (
            <div className="text-[var(--fs-2xs)] font-medium uppercase tracking-[var(--tracking-wide)] text-muted-foreground">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="text-[var(--fs-2xl)] md:text-[var(--fs-3xl)] font-semibold leading-tight tracking-[var(--tracking-tight)]">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-[var(--fs-sm)] md:text-[var(--fs-base)] text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 md:justify-end md:shrink-0">
            {actions}
          </div>
        ) : null}
      </div>
      {tabs ? <div className="min-w-0">{tabs}</div> : null}
    </header>
  );
}
