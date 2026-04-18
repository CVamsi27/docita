import type React from "react";

import { cn } from "@workspace/ui/lib/utils";

interface PageLayoutProps {
  header?: React.ReactNode;
  children: React.ReactNode;
  rightRail?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  maxWidth?: "md" | "lg" | "xl" | "2xl" | "full";
}

const MAX_WIDTHS: Record<NonNullable<PageLayoutProps["maxWidth"]>, string> = {
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-7xl",
  "2xl": "max-w-[96rem]",
  full: "max-w-none",
};

export function PageLayout({
  header,
  children,
  rightRail,
  footer,
  className,
  maxWidth = "xl",
}: PageLayoutProps) {
  return (
    <div className={cn("mx-auto w-full min-w-0", MAX_WIDTHS[maxWidth], className)}>
      {header ? <div className="mb-6">{header}</div> : null}
      <div
        className={cn(
          "grid min-w-0 gap-6",
          rightRail && "lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]",
        )}
      >
        <div className="min-w-0 space-y-6">{children}</div>
        {rightRail ? (
          <aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">
            {rightRail}
          </aside>
        ) : null}
      </div>
      {footer ? <div className="mt-8">{footer}</div> : null}
    </div>
  );
}
