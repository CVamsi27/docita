"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { cn } from "../../lib/utils";

export interface PageTabItem {
  id: string;
  label: string;
  href?: string;
  disabled?: boolean;
  badge?: React.ReactNode;
}

export interface PageTabsProps {
  items: PageTabItem[];
  activeId: string;
  onSelect?: (id: string) => void;
  /** Render each tab as a Link. Use when tabs change route. */
  renderLink?: (
    item: PageTabItem,
    children: React.ReactNode,
  ) => React.ReactElement;
  ariaLabel?: string;
  className?: string;
}

/**
 * Origin-style thin-underline tab strip that lives directly under a PageHeader
 * title. Tabs sync to URL or local state via the parent.
 */
export function PageTabs({
  items,
  activeId,
  onSelect,
  renderLink,
  ariaLabel = "Section tabs",
  className,
}: PageTabsProps) {
  const activeTabRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    activeTabRef.current?.scrollIntoView?.({
      block: "nearest",
      inline: "nearest",
    });
  }, [activeId]);

  return (
    <div
      className={cn(
        "overflow-x-auto overscroll-x-contain [scrollbar-width:thin] max-md:-mx-4 max-md:px-4",
        className,
      )}
    >
      <div
        role="tablist"
        aria-label={ariaLabel}
        className="flex w-max min-w-full items-end gap-6 border-b border-border/60 max-md:gap-4"
      >
        {items.map((item) => {
          const isActive = item.id === activeId;
          const inner = (
            <>
              <span className="truncate">{item.label}</span>
              {item.badge ? (
                <span className="ml-1 inline-flex items-center">
                  {item.badge}
                </span>
              ) : null}
            </>
          );
          const sharedClass = cn(
            "relative flex shrink-0 items-center pb-2 pt-1 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isActive
              ? "text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground"
              : "text-muted-foreground hover:text-foreground",
            item.disabled && "pointer-events-none opacity-50",
          );

          const tabButton = (
            <button
              key={item.id}
              ref={isActive ? activeTabRef : undefined}
              role="tab"
              aria-selected={isActive}
              aria-disabled={item.disabled}
              tabIndex={isActive ? 0 : -1}
              type="button"
              className={sharedClass}
              onClick={() => onSelect?.(item.id)}
            >
              {inner}
            </button>
          );

          if (renderLink && item.href) {
            return renderLink(item, tabButton);
          }

          return tabButton;
        })}
      </div>
    </div>
  );
}
