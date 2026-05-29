"use client";

import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import {
  StatusBadge,
  type StatusType,
} from "@workspace/ui/components/indicators/status-badge";

export interface ListRowProps {
  token?: string | null;
  title: string;
  meta?: ReactNode;
  time?: string | null;
  status?: StatusType | string;
  statusLabel?: string;
  trailing?: ReactNode;
  showChevron?: boolean;
  onClick?: () => void;
  className?: string;
  children?: ReactNode;
}

/**
 * Card/list row: mono token · title · meta · trailing time + status pill.
 * Canonical mobile fallback for DataTable stackOnMobile and queue lists.
 */
export function ListRow({
  token,
  title,
  meta,
  time,
  status,
  statusLabel,
  trailing,
  showChevron = true,
  onClick,
  className,
  children,
}: ListRowProps) {
  const interactive = Boolean(onClick);
  const Wrapper = interactive ? "button" : "div";

  return (
    <Wrapper
      type={interactive ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "grid w-full items-center gap-3 border-b border-border/60 px-4 py-3.5 text-left last:border-b-0",
        token
          ? "grid-cols-[auto_1fr_auto]"
          : "grid-cols-[1fr_auto]",
        interactive &&
          "cursor-pointer touch-manipulation transition-colors duration-150 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        className,
      )}
    >
      {token ? (
        <span className="font-mono text-sm tabular-nums text-muted-foreground">
          {token}
        </span>
      ) : null}

      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-foreground">
          {title}
        </div>
        {meta ? (
          <div className="truncate text-xs text-muted-foreground">{meta}</div>
        ) : null}
        {children}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        {time ? (
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {time}
          </span>
        ) : null}
        {status ? (
          <StatusBadge status={status} label={statusLabel} size="sm" />
        ) : null}
        {trailing}
        {showChevron && interactive ? (
          <ChevronRight
            className="size-4 text-muted-foreground"
            aria-hidden
          />
        ) : null}
      </div>
    </Wrapper>
  );
}

export interface ListRowGroupProps {
  children: ReactNode;
  className?: string;
}

/** Bordered card wrapper for a stack of ListRow items. */
export function ListRowGroup({ children, className }: ListRowGroupProps) {
  return (
    <div
      className={cn(
        "ui-card-surface overflow-hidden rounded-[var(--radius)] border border-border/70",
        className,
      )}
    >
      {children}
    </div>
  );
}
