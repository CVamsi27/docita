import type React from "react";

import { cn } from "../lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  density?: "default" | "compact" | "spacious";
}

const densityClasses = {
  compact: "space-y-4",
  default: "space-y-6 md:space-y-8",
  spacious: "space-y-8 md:space-y-10",
} as const;

export function PageContainer({
  children,
  className,
  density = "default",
}: PageContainerProps) {
  return (
    <div className={cn("ui-page-shell", densityClasses[density], className)}>
      {children}
    </div>
  );
}
