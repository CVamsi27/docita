"use client";

import { cn } from "@workspace/ui/lib/utils";

export interface LiveDotProps {
  size?: "sm" | "md";
  tone?: "cyan" | "primary" | "success" | "warning" | "destructive";
  className?: string;
  ariaLabel?: string;
}

const sizeMap = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
} as const;

const toneMap = {
  cyan: "bg-[var(--brand-cyan)]",
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
} as const;

export function LiveDot({
  size = "sm",
  tone = "cyan",
  className,
  ariaLabel,
}: LiveDotProps) {
  return (
    <span
      role={ariaLabel ? "status" : undefined}
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        sizeMap[size],
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 rounded-full opacity-50 motion-reduce:hidden",
          toneMap[tone],
        )}
        style={{
          animation: "docita-live-pulse 1.6s var(--motion-ease) infinite",
        }}
      />
      <span
        aria-hidden
        className={cn("relative inline-block rounded-full", sizeMap[size], toneMap[tone])}
      />
    </span>
  );
}
