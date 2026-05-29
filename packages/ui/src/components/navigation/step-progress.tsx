"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

export interface StepProgressItem {
  id: string;
  label: string;
  done?: boolean;
  optional?: boolean;
}

export interface StepProgressProps {
  items: StepProgressItem[];
  activeId: string;
  onSelect?: (id: string) => void;
  ariaLabel?: string;
  className?: string;
  /** Show compact numbered dots only (mobile). */
  compact?: boolean;
  trailing?: React.ReactNode;
}

function StepDot({
  index,
  done,
  active,
  label,
  compact,
  onClick,
}: {
  index: number;
  done?: boolean;
  active?: boolean;
  label: string;
  compact?: boolean;
  onClick?: () => void;
}) {
  const interactive = Boolean(onClick);
  const Wrapper = interactive ? "button" : "div";

  return (
    <Wrapper
      type={interactive ? "button" : undefined}
      onClick={onClick}
      aria-current={active ? "step" : undefined}
      aria-label={label}
      className={cn(
        "flex items-center gap-2",
        active
          ? "text-primary"
          : done
            ? "text-foreground"
            : "text-muted-foreground",
        interactive &&
          "touch-manipulation rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <span
        className={cn(
          "inline-flex size-[22px] shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-semibold",
          active && "bg-primary text-primary-foreground",
          done && !active && "bg-success text-white",
          !active && !done && "bg-muted text-muted-foreground",
        )}
      >
        {done && !active ? <Check className="size-3" aria-hidden /> : index + 1}
      </span>
      {!compact ? (
        <span
          className={cn(
            "text-sm",
            active ? "font-semibold" : "font-medium",
          )}
        >
          {label}
        </span>
      ) : null}
    </Wrapper>
  );
}

/**
 * Numbered SOAP step strip (Vitals → Prescribe) from design-kit PatientChart.
 */
export function StepProgress({
  items,
  activeId,
  onSelect,
  ariaLabel = "Progress steps",
  className,
  compact = false,
  trailing,
}: StepProgressProps) {
  const doneCount = items.filter((item) => item.done).length;
  const progressPct =
    items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="ui-eyebrow">{progressPct}% complete</span>
        {trailing}
      </div>
      <div
        role="list"
        aria-label={ariaLabel}
        className={cn(
          "flex items-center gap-2 overflow-x-auto overscroll-x-contain pb-1 [scrollbar-width:thin]",
          compact && "gap-3",
        )}
      >
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            {index > 0 ? (
              <span
                className="shrink-0 text-border"
                aria-hidden
              >
                —
              </span>
            ) : null}
            <StepDot
              index={index}
              done={item.done}
              active={item.id === activeId}
              label={item.label}
              compact={compact}
              onClick={onSelect ? () => onSelect(item.id) : undefined}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
