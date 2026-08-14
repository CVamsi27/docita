import type React from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
  separator?: React.ReactNode;
  renderLink?: (
    item: BreadcrumbItem,
    children: React.ReactNode,
  ) => React.ReactNode;
  maxVisible?: number;
}

export function Breadcrumbs({
  items,
  className,
  separator,
  renderLink,
  maxVisible = 4,
}: BreadcrumbsProps) {
  if (!items.length) return null;

  const visible =
    items.length <= maxVisible
      ? items
      : [items[0]!, { label: "…" } as BreadcrumbItem, ...items.slice(-2)];

  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex items-center gap-1.5 text-[var(--fs-xs)] text-muted-foreground">
        {visible.map((item, index) => {
          const isLast = index === visible.length - 1;
          const content = (
            <span
              className={cn(
                "flex items-center gap-1.5 truncate",
                isLast ? "text-foreground font-medium" : "hover:text-foreground",
              )}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </span>
          );
          return (
            <li
              key={`${item.label}-${index}`}
              className="flex items-center gap-1.5 min-w-0"
            >
              {item.href && !isLast && renderLink
                ? renderLink(item, content)
                : content}
              {!isLast ? (
                <span aria-hidden className="text-muted-foreground/60">
                  {separator ?? <ChevronRight className="size-3.5" />}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
