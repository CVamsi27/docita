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
  size?: "default" | "compact";
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
  size = "default",
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
        <div
          className={cn(
            "min-w-0",
            size === "compact" ? "space-y-0.5" : "ui-copy-stack",
          )}
        >
          {eyebrow ? <div className="ui-eyebrow">{eyebrow}</div> : null}
          <h1
            className={cn(
              size === "compact" ? "ui-section-title" : "ui-page-title",
            )}
          >
            {title}
          </h1>
          {description ? (
            <p
              className={cn(
                "max-w-2xl",
                size === "compact" ? "ui-section-subtitle" : "ui-page-subtitle",
              )}
            >
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
