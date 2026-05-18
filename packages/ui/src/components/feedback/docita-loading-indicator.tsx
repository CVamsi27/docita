"use client";

import { cn } from "@workspace/ui/lib/utils";

import { DocitaIcon } from "../indicators/docita-logo";

export type DocitaLoadingIndicatorVariant = "page" | "section" | "inline";

export interface DocitaLoadingIndicatorProps {
  variant?: DocitaLoadingIndicatorVariant;

  /** When unset, defaults: page true, section/inline false */
  showProgressBar?: boolean;

  className?: string;

  iconClassName?: string;

  "aria-label"?: string;

  /**
   * Use inside buttons or other controls that already expose an accessible name.
   * Sets aria-hidden on the decorative mark.
   */
  decorative?: boolean;

  /**
   * When false, the indicator does not use role="status" (parent supplies live region).
   */
  withStatusRole?: boolean;

  /** Passed to DocitaIcon; use "" for decorative contexts */
  iconAlt?: string;
}

const variantIconDefault: Record<DocitaLoadingIndicatorVariant, string> = {
  page: "h-12 w-12",
  section: "h-10 w-10",
  inline: "h-4 w-4",
};

const variantProgressDefault: Record<DocitaLoadingIndicatorVariant, boolean> = {
  page: true,
  section: false,
  inline: false,
};

export function DocitaLoadingIndicator({
  variant = "section",
  showProgressBar,
  className,
  iconClassName,
  "aria-label": ariaLabel = "Loading",
  decorative = false,
  withStatusRole = true,
  iconAlt,
}: DocitaLoadingIndicatorProps) {
  const iconSize = cn(variantIconDefault[variant], iconClassName);
  const barVisible = showProgressBar ?? variantProgressDefault[variant];

  if (variant === "inline") {
    return (
      <span
        className={cn(
          "docita-loading-pulse inline-flex shrink-0 items-center justify-center",
          className,
        )}
        aria-hidden={decorative ? true : undefined}
        role={decorative ? undefined : "status"}
        aria-label={decorative ? undefined : ariaLabel}
      >
        <DocitaIcon className={iconSize} alt={iconAlt ?? ""} />
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        className,
      )}
      role={withStatusRole ? "status" : undefined}
      aria-label={withStatusRole ? ariaLabel : undefined}
    >
      <div className="docita-loading-pulse shrink-0" aria-hidden={!withStatusRole}>
        <DocitaIcon className={iconSize} alt={iconAlt ?? ""} />
      </div>
      {barVisible ? (
        <div
          className="h-1 w-24 overflow-hidden rounded-full bg-muted"
          aria-hidden
        >
          <div className="docita-loading-shimmer h-full w-1/2 rounded-full bg-primary/40" />
        </div>
      ) : null}
    </div>
  );
}
