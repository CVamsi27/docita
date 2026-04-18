import type React from "react";

import { cn } from "@workspace/ui/lib/utils";

interface AppPageScaffoldProps {
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function AppPageScaffold({
  header,
  children,
  className,
  contentClassName,
}: AppPageScaffoldProps) {
  return (
    <section className={cn("mx-auto w-full min-w-0 max-w-7xl", className)}>
      {header ? <div className="mb-6">{header}</div> : null}
      <div className={cn("min-w-0 space-y-6", contentClassName)}>{children}</div>
    </section>
  );
}
