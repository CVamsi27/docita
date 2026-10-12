"use client";

import * as React from "react";
import { cn } from "@workspace/ui/lib/utils";
import { resolveRovingTablistTarget } from "@workspace/ui/lib/roving-tablist";

export interface SegmentedControlItem {
  id: string;
  label: string;
  disabled?: boolean;
}

export interface SegmentedControlProps {
  items: SegmentedControlItem[];
  activeId: string;
  onSelect: (id: string) => void;
  ariaLabel?: string;
  className?: string;
  size?: "sm" | "default";
}

/**
 * Pill segmented control for mobile tabs, queue filters, and role switches.
 * Matches the design-kit pattern in clinic-os MobileApp / TodayScreen.
 */
export function SegmentedControl({
  items,
  activeId,
  onSelect,
  ariaLabel = "Segmented control",
  className,
  size = "default",
}: SegmentedControlProps) {
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const activeIndex = items.findIndex((item) => item.id === activeId);
    const nextIndex = resolveRovingTablistTarget({
      key: event.key,
      count: items.length,
      currentIndex: activeIndex,
      isDisabled: (index) => items[index]?.disabled === true,
    });
    if (nextIndex === null) return;

    event.preventDefault();

    const nextItem = items[nextIndex];
    tabRefs.current[nextIndex]?.focus();
    if (nextItem) onSelect(nextItem.id);
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      onKeyDown={handleKeyDown}
      className={cn(
        "flex gap-1 rounded-[10px] bg-muted p-[3px]",
        className,
      )}
    >
      {items.map((item, index) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={item.disabled}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            tabIndex={isActive ? 0 : -1}
            onClick={() => onSelect(item.id)}
            className={cn(
              "flex-1 rounded-[7px] border-0 font-medium transition-colors duration-150",
              "touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm",
              isActive
                ? "bg-card text-foreground shadow-sm"
                : "bg-transparent text-muted-foreground hover:text-foreground",
              item.disabled && "pointer-events-none opacity-50",
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
