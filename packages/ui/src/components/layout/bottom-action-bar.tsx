"use client";

import type { ReactNode } from "react";
import { cn } from "@workspace/ui/lib/utils";

export interface BottomActionBarProps {
  children: ReactNode;
  className?: string;
  /** When true, bar is fixed to viewport bottom with safe-area padding. */
  fixed?: boolean;
  /**
   * Defaults to `group` so a docked bar is exposed to assistive tech instead
   * of being an anonymous `<div>`.
   */
  role?: "group" | "region" | "toolbar";
  /** Only announced when paired with a role; a bare `aria-label` is ignored. */
  "aria-label"?: string;
}

/**
 * Fixed bottom action dock for mobile surfaces (Next patient, quick replies).
 * Uses safe-area insets; no emoji — Lucide + sentence-case labels only.
 */
export function BottomActionBar({
  children,
  className,
  fixed = true,
  role = "group",
  "aria-label": ariaLabel,
}: BottomActionBarProps) {
  return (
    <div
      role={role}
      aria-label={ariaLabel}
      className={cn(
        "flex items-stretch gap-2.5 border-t border-border/70 bg-background/95 px-4 py-3 backdrop-blur-sm",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        fixed && "fixed inset-x-0 bottom-0 z-40 md:hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface BottomActionBarSlotProps {
  children: ReactNode;
  className?: string;
  /** Primary slot grows to fill available width. */
  variant?: "primary" | "secondary";
}

export function BottomActionBarSlot({
  children,
  className,
  variant = "secondary",
}: BottomActionBarSlotProps) {
  return (
    <div
      className={cn(
        variant === "primary" && "flex-1 min-w-0",
        variant === "secondary" && "shrink-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
