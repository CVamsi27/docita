"use client";

import * as React from "react";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { cn } from "@workspace/ui/lib/utils";

export interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

const iconClassBySize: Record<NonNullable<LoaderProps["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-8 w-8",
  lg: "h-12 w-12",
};

const Spinner = React.forwardRef<HTMLDivElement, LoaderProps>(
  ({ className, size = "md", ...props }, ref) => {
    const iconClassName = iconClassBySize[size];

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex shrink-0 items-center justify-center",
          className,
        )}
        {...props}
      >
        <DocitaLoadingIndicator
          variant="inline"
          decorative
          iconClassName={iconClassName}
        />
      </div>
    );
  },
);
Spinner.displayName = "Spinner";

export interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  loading: boolean;
}

const LoadingOverlay = React.forwardRef<HTMLDivElement, LoadingOverlayProps>(
  ({ className, loading = false, children, ...props }, ref) => {
    if (!loading) return children;

    return (
      <div ref={ref} className={cn("relative isolate", className)} {...props}>
        {children}
        <div
          className="absolute inset-0 flex items-center justify-center rounded-md bg-background/50 backdrop-blur-sm"
          role="status"
          aria-live="polite"
          aria-label="Loading"
        >
          <Spinner />
        </div>
      </div>
    );
  },
);
LoadingOverlay.displayName = "LoadingOverlay";

export { Spinner, LoadingOverlay };
