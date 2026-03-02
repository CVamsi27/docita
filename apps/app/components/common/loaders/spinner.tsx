

import * as React from "react";
import { cn } from "@/lib/utils";

export interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

const Spinner = React.forwardRef<HTMLDivElement, LoaderProps>(
  ({ className, size = "md", ...props }, ref) => {
    const sizeClass = {
      sm: "h-4 w-4",
      md: "h-8 w-8",
      lg: "h-12 w-12",
    }[size];

    return (
      <div
        ref={ref}
        className={cn(
          "inline-block animate-spin rounded-full border-2 border-muted border-t-primary",
          sizeClass,
          className,
        )}
        {...props}
      />
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
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-md">
          <Spinner />
        </div>
      </div>
    );
  },
);
LoadingOverlay.displayName = "LoadingOverlay";

export { Spinner, LoadingOverlay };
