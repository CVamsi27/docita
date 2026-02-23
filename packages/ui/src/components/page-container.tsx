import type React from "react";

import { cn } from "../lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl space-y-6 p-4 md:p-6", className)}
    >
      {children}
    </div>
  );
}
