"use client";

import type { ReactNode } from "react";
import { Button } from "@workspace/ui/components/form/button";
import { cn } from "@workspace/ui/lib/utils";

interface HistoryBlockProps {
  /** Icon shown next to the section title (lucide-react element). */
  icon: ReactNode;
  /** Section title (e.g. "Problem List", "Family History"). */
  title: string;
  /** Optional count badge (e.g. "3", "2 active"). */
  count?: number;
  /** Right-aligned node — usually a severity chip or status badge. */
  trailing?: ReactNode;
  /** Inline add/filter controls row. */
  addRow?: ReactNode;
  /** Class for the section's body content. */
  children: ReactNode;
  /** Optional class for the section root. */
  className?: string;
}

/**
 * Shared wrapper that gives every patient history sub-block the same visual
 * rhythm on the consultation page: a tight title row with icon + count, a
 * bordered content area, and a separate add-row at the bottom. The compact
 * variant strips the card chrome for inline use inside a `Card`/`Section`.
 */
export function HistoryBlock({
  icon,
  title,
  count,
  trailing,
  addRow,
  children,
  className,
}: HistoryBlockProps) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-md)] border border-border/60 bg-background/60 p-3.5",
        className,
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            {icon}
          </span>
          <h3 className="truncate text-sm font-semibold leading-none text-foreground">
            {title}
          </h3>
          {typeof count === "number" && count > 0 ? (
            <span className="rounded-full border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
              {count}
            </span>
          ) : null}
        </div>
        {trailing ? (
          <div className="shrink-0 text-xs text-muted-foreground">{trailing}</div>
        ) : null}
      </header>
      <div className="space-y-2">{children}</div>
      {addRow ? (
        <div className="mt-3 border-t border-border/40 pt-3">{addRow}</div>
      ) : null}
    </section>
  );
}

interface HistoryEmptyStateProps {
  message: string;
  tone?: "neutral" | "success";
}

export function HistoryEmptyState({
  message,
  tone = "neutral",
}: HistoryEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 rounded-lg border border-dashed py-5 text-xs",
        tone === "success"
          ? "border-success/30 bg-success/5 text-success"
          : "border-border/60 bg-muted/20 text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "success" ? "bg-success" : "bg-muted-foreground/50",
        )}
        aria-hidden
      />
      {message}
    </div>
  );
}

interface HistoryAddRowProps {
  /** Disable the "Add" button (and prevent Enter-submit) when invalid. */
  disabled?: boolean;
  /** Submit label, e.g. "Add". */
  addLabel?: string;
  /** Handler invoked when the user clicks "Add" or presses Enter inside an input. */
  onAdd: () => void;
  /** Form controls rendered above the "Add" button. */
  children: ReactNode;
}

/**
 * Shared footer for history sub-blocks: a tight input/button row that uses
 * Enter-to-submit on the first input and a single primary "Add" button.
 * Extracted so the family/surgery/condition blocks don't carry the same
 * `flex flex-wrap gap-2 items-center` shell three times.
 */
export function HistoryAddRow({
  disabled,
  addLabel = "Add",
  onAdd,
  children,
}: HistoryAddRowProps) {
  return (
    <div
      className="flex flex-wrap gap-2 items-center"
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        const target: HTMLElement | null =
          event.target instanceof HTMLElement ? event.target : null;
        if (target?.tagName === "TEXTAREA") return;
        if (disabled) return;
        event.preventDefault();
        onAdd();
      }}
    >
      {children}
      <Button
        type="button"
        size="sm"
        onClick={onAdd}
        disabled={disabled}
      >
        {addLabel}
      </Button>
    </div>
  );
}
