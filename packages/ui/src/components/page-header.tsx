import type React from "react";

import { cn } from "@workspace/ui/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  sticky?: boolean;
}

export function PageHeader({
  title,
  description,
  actions,
  className,
  sticky = false,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-3 md:flex-row md:items-start md:justify-between",
        sticky &&
          "sticky top-0 z-20 -mx-4 border-b bg-background/95 px-4 py-3 md:-mx-6 md:px-6",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight leading-tight">
          {title}
        </h1>
        {description ? (
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 md:justify-end md:shrink-0">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
