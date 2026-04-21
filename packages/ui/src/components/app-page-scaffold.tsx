import type React from "react";

import { cn } from "@workspace/ui/lib/utils";

interface AppPageScaffoldProps {
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  density?: "default" | "compact" | "spacious";
}

const densityClasses = {
  compact: {
    header: "mb-4",
    content: "space-y-4",
  },
  default: {
    header: "mb-6",
    content: "space-y-6 md:space-y-8",
  },
  spacious: {
    header: "mb-8",
    content: "space-y-8 md:space-y-10",
  },
} as const;

export function AppPageScaffold({
  header,
  children,
  className,
  contentClassName,
  density = "default",
}: AppPageScaffoldProps) {
  const classes = densityClasses[density];

  return (
    <section className={cn("ui-page-shell", className)}>
      {header ? <div className={classes.header}>{header}</div> : null}
      <div className={cn("min-w-0", classes.content, contentClassName)}>
        {children}
      </div>
    </section>
  );
}
