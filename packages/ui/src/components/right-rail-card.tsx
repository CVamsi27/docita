"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "../lib/utils";
import { Button } from "./button";
import { MicroLabel } from "./micro-label";

export interface RightRailCardProps {
  /** All-caps category prefix shown above the headline. */
  category: string;
  headline: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  tone?: "default" | "info" | "success" | "warning" | "destructive";
  className?: string;
  children?: React.ReactNode;
}

const TONE_CLASSES: Record<NonNullable<RightRailCardProps["tone"]>, string> = {
  default: "bg-card",
  info: "bg-info/10",
  success: "bg-success/10",
  warning: "bg-warning/10",
  destructive: "bg-destructive/10",
};

export function RightRailCard({
  category,
  headline,
  description,
  action,
  onDismiss,
  dismissLabel = "Dismiss",
  tone = "default",
  className,
  children,
}: RightRailCardProps) {
  return (
    <article
      className={cn(
        "relative rounded-[var(--radius-lg)] border border-border/60 p-4 shadow-sm",
        TONE_CLASSES[tone],
        className,
      )}
    >
      {onDismiss ? (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 size-7 text-muted-foreground hover:text-foreground"
          onClick={onDismiss}
          aria-label={dismissLabel}
          type="button"
        >
          <X className="size-3.5" />
        </Button>
      ) : null}
      <MicroLabel className="pr-8">{category}</MicroLabel>
      <h3 className="mt-1 text-base font-semibold leading-snug">{headline}</h3>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
      {children}
      {action ? <div className="mt-3">{action}</div> : null}
    </article>
  );
}

export interface RightRailCardStackProps {
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

/**
 * Vertical stack of dismissible advisor cards on `/today` and patient detail.
 * Becomes a horizontal scroll strip below `md`.
 */
export function RightRailCardStack({
  children,
  className,
  ariaLabel = "Recommendations",
}: RightRailCardStackProps) {
  return (
    <aside
      aria-label={ariaLabel}
      className={cn(
        "flex gap-3 md:flex-col md:gap-3",
        "max-md:overflow-x-auto max-md:pb-2 max-md:[&>*]:min-w-[260px]",
        className,
      )}
    >
      {children}
    </aside>
  );
}
