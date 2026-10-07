"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { cn } from "../../lib/utils";
import { resolveRovingTablistTarget } from "../../lib/roving-tablist";

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
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    activeTabRef.current?.scrollIntoView?.({
      block: "nearest",
      inline: "nearest",
    });
  }, [activeId]);

  const assignTabRef = (
    index: number,
    isActive: boolean,
    node: HTMLButtonElement | null,
  ) => {
    tabRefs.current[index] = node;
    if (isActive) activeTabRef.current = node;
  };

  // Roving tabindex only stays usable when arrow keys move focus, so inactive
  // tabs remain reachable once the strip is entered with Tab.
  const handleTablistKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const tabs = tabRefs.current;
    const focusedIndex = tabs.findIndex(
      (tab) => tab === document.activeElement,
    );

    const nextIndex = resolveRovingTablistTarget({
      key: event.key,
      count: items.length,
      currentIndex:
        focusedIndex >= 0
          ? focusedIndex
          : items.findIndex((item) => item.id === activeId),
      isDisabled: (index) => items[index]?.disabled === true,
    });
    if (nextIndex === null) return;

    event.preventDefault();

    const nextItem = items[nextIndex];
    tabs[nextIndex]?.focus();
    if (nextItem && !nextItem.href) onSelect?.(nextItem.id);
  };

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
        onKeyDown={handleTablistKeyDown}
        className="flex w-max min-w-full items-end gap-6 border-b border-border/60 max-md:gap-4"
      >
        {items.map((item, index) => {
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
              type="button"
              ref={(node) => assignTabRef(index, isActive, node)}
              role="tab"
              aria-selected={isActive}
              aria-disabled={item.disabled}
              tabIndex={isActive ? 0 : -1}
              className={sharedClass}
              onClick={() => onSelect?.(item.id)}
            >
              {inner}
            </button>
          );

          if (renderLink && item.href) {
            return React.cloneElement(renderLink(item, tabButton), {
              key: item.id,
            });
          }

          return tabButton;
        })}
      </div>
    </div>
  );
}
