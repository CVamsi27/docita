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
  /** Merged into the description container (after default subtitle / max-width classes). */
  descriptionClassName?: string;
  sticky?: boolean;
  size?: "default" | "compact";
  /** When `center`, title and description are centered; actions sit on the next row (end-aligned from md). */
  titleAlign?: "start" | "center";
  /** Merged into the `md:flex` row that holds the title block and actions (default `md:items-start`). */
  splitRowClassName?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  tabs,
  eyebrow,
  className,
  descriptionClassName,
  sticky = false,
  size = "default",
  titleAlign = "start",
  splitRowClassName,
}: PageHeaderProps) {
  const titleCentered = titleAlign === "center";

  const copyBlock = (
    <div
      className={cn(
        "min-w-0",
        titleCentered && "text-center",
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
        <div
          className={cn(
            titleCentered ? "mx-auto max-w-2xl" : "max-w-2xl",
            size === "compact" ? "ui-section-subtitle" : "ui-page-subtitle",
            descriptionClassName,
          )}
        >
          {description}
        </div>
      ) : null}
    </div>
  );

  const actionsRow = actions ? (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 md:shrink-0",
        titleCentered
          ? "justify-center md:justify-end"
          : "md:justify-end",
      )}
    >
      {actions}
    </div>
  ) : null;

  return (
    <header
      className={cn(
        "flex flex-col gap-3",
        titleCentered && "mt-2",
        sticky &&
          "sticky top-0 z-20 -mx-4 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6",
        className,
      )}
    >
      {breadcrumbs ? <div className="min-w-0">{breadcrumbs}</div> : null}
      {titleCentered ? (
        <div className="flex flex-col gap-3">
          {copyBlock}
          {actionsRow}
        </div>
      ) : (
        <div
          className={cn(
            "flex flex-col gap-3 md:flex-row md:items-start md:justify-between",
            splitRowClassName,
          )}
        >
          {copyBlock}
          {actionsRow}
        </div>
      )}
      {tabs ? <div className="min-w-0">{tabs}</div> : null}
    </header>
  );
}
