"use client";

import * as React from "react";
import { cn } from "@workspace/ui/lib/utils.js";

export interface FormGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 1 | 2 | 3;
}

export function FormGrid({ className, columns = 2, ...props }: FormGridProps) {
  const gridColsClass = {
    1: "grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
  }[columns];

  return (
    <div className={cn("grid gap-4", gridColsClass, className)} {...props} />
  );
}

export interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export function FormSection({
  title,
  description,
  icon,
  className,
  children,
  ...props
}: FormSectionProps) {
  return (
    <div className="space-y-4" {...props}>
      {(title || description || icon) && (
        <div className="space-y-1">
          {title && (
            <div className="flex items-center gap-2">
              {icon}
              <h3 className="font-semibold text-sm">{title}</h3>
            </div>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className={className}>{children}</div>
    </div>
  );
}
