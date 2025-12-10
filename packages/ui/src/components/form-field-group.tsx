"use client";

import * as React from "react";
import { Label } from "./label.js";
import { cn } from "@workspace/ui/lib/utils.js";

export interface FormFieldGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export function FormFieldGroup({
  label,
  required,
  error,
  hint,
  className,
  children,
  ...props
}: FormFieldGroupProps) {
  return (
    <div className="space-y-2" {...props}>
      {label && (
        <Label
          className={cn(
            required && "after:content-['_*'] after:text-destructive",
          )}
        >
          {label}
        </Label>
      )}
      <div className={className}>{children}</div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
