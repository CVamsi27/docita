import type React from "react";

import { cn } from "@workspace/ui/lib/utils";

interface ToolbarProps {
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function Toolbar({ leading, trailing, children, className }: ToolbarProps) {
  return (
    <div
      role="toolbar"
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-border/60 bg-surface-2 px-2 py-1.5",
        className,
      )}
    >
      {leading ? <div className="flex flex-wrap items-center gap-1.5">{leading}</div> : null}
      {children ? <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">{children}</div> : null}
      {trailing ? <div className="ml-auto flex flex-wrap items-center gap-1.5">{trailing}</div> : null}
    </div>
  );
}
