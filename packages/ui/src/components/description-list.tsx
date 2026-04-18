import type React from "react";

import { cn } from "@workspace/ui/lib/utils";

export interface DescriptionListItem {
  term: React.ReactNode;
  description: React.ReactNode;
  key?: string;
}

interface DescriptionListProps {
  items: DescriptionListItem[];
  columns?: 1 | 2 | 3;
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export function DescriptionList({
  items,
  columns = 2,
  className,
  orientation = "horizontal",
}: DescriptionListProps) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 gap-y-3",
        columns === 1 && "grid-cols-1",
        columns === 2 && "grid-cols-1 sm:grid-cols-2",
        columns === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {items.map((item, idx) => (
        <div
          key={item.key ?? idx}
          className={cn(
            "min-w-0",
            orientation === "horizontal" && "grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] items-start gap-3",
          )}
        >
          <dt className="text-[var(--fs-xs)] font-medium text-muted-foreground">
            {item.term}
          </dt>
          <dd className="text-[var(--fs-sm)] text-foreground min-w-0 break-words">
            {item.description}
          </dd>
        </div>
      ))}
    </dl>
  );
}
