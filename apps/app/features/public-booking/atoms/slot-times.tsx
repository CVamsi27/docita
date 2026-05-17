"use client";

import type { ReactNode } from "react";
import { MicroLabel } from "@workspace/ui/components/micro-label";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { cn } from "@workspace/ui/lib/utils";

export function SlotTimesSkeletonGrid({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col rounded-[var(--radius-md)] border border-border/70 bg-card p-3 shadow-sm ring-1 ring-border/40 sm:p-4 xl:min-h-0 xl:flex-1",
        className,
      )}
    >
      <MicroLabel as="p" className="mb-3 mt-0 text-muted-foreground">
        Loading open times…
      </MicroLabel>
      <div className="grid flex-1 auto-rows-min grid-cols-1 content-start gap-2.5 sm:grid-cols-2 sm:gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton
            key={`slot-sk-${i}`}
            className="h-[3.25rem] w-full min-w-0 rounded-[var(--radius-md)]"
          />
        ))}
      </div>
    </div>
  );
}

export function SlotTimesScrollArea({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const shell =
    "rounded-[var(--radius-md)] border border-border/70 bg-background shadow-sm ring-1 ring-border/40";
  const pad = "p-2.5 sm:p-3.5";
  if (!enabled) {
    return (
      <div
        className={cn(
          shell,
          pad,
          "flex min-h-0 flex-1 flex-col xl:min-h-0",
        )}
      >
        {children}
      </div>
    );
  }
  return (
    <ScrollArea
      className={cn(
        shell,
        "min-h-[12rem] w-full max-h-[min(17rem,42vh)] xl:flex-1 xl:max-h-none xl:min-h-0 xl:h-full",
      )}
    >
      <div className={pad}>{children}</div>
    </ScrollArea>
  );
}
