import type React from "react";

import { cn } from "@workspace/ui/lib/utils";

interface SectionProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  as?: keyof React.JSX.IntrinsicElements;
  id?: string;
  compact?: boolean;
  tone?: "default" | "muted" | "info" | "success" | "warning" | "danger";
}

const toneClasses = {
  default: "ui-panel",
  muted: "ui-panel-muted",
  info: "ui-panel surface-info",
  success: "ui-panel surface-success",
  warning: "ui-panel surface-warning",
  danger: "ui-panel surface-danger",
} as const;

export function Section({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
  as: Tag = "section",
  id,
  compact = false,
  tone = "default",
}: SectionProps) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <Tag
      id={id}
      aria-labelledby={title && headingId ? headingId : undefined}
      className={cn(toneClasses[tone], className)}
    >
      {(title || actions || description) && (
        <header
          className={cn(
            "flex flex-col gap-2 border-b border-border/60 px-4 py-3 md:flex-row md:items-start md:justify-between",
            compact && "py-2",
          )}
        >
          <div className="min-w-0 space-y-0.5">
            {title ? (
              <h2 id={headingId} className="ui-section-title">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="ui-helper-text">{description}</p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-2 md:shrink-0">
              {actions}
            </div>
          ) : null}
        </header>
      )}
      <div className={cn(compact ? "p-3" : "p-4", contentClassName)}>
        {children}
      </div>
    </Tag>
  );
}
