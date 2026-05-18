import type React from "react";

import { cn } from "@workspace/ui/lib/utils";

interface TopBarProps {
  leading?: React.ReactNode;
  center?: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
}

export function TopBar({ leading, center, trailing, className }: TopBarProps) {
  return (
    <div
      className={cn(
        "flex h-14 w-full items-center gap-3 px-3 md:px-5",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">{leading}</div>
      {center ? (
        <div className="hidden min-w-0 max-w-xl flex-1 items-center justify-center md:flex">
          {center}
        </div>
      ) : null}
      <div className="flex shrink-0 items-center gap-1.5">{trailing}</div>
    </div>
  );
}
