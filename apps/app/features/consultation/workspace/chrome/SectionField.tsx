"use client";

import type { ReactNode } from "react";
import { Label } from "@workspace/ui/components/form/label";
import { cn } from "@workspace/ui/lib/utils";

interface SectionFieldProps {
  /** Field group title (sentence case). */
  title: string;
  /** Associates the title with a single control below it. */
  htmlFor?: string;
  /** Right-aligned meta — typically a count ("2 recorded") or status. */
  meta?: ReactNode;
  /** One-line helper shown under the title. */
  hint?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Consistent field-group header used inside consultation sections so every
 * section (Subjective, Assessment, Plan, …) shares one rhythm: a bold title,
 * an optional right-aligned count, an optional hint, then the control.
 */
export function SectionField({
  title,
  htmlFor,
  meta,
  hint,
  children,
  className,
}: SectionFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-baseline justify-between gap-2">
        {htmlFor ? (
          <Label htmlFor={htmlFor} className="text-sm font-semibold">
            {title}
          </Label>
        ) : (
          <h3 className="text-sm font-semibold leading-none">{title}</h3>
        )}
        {meta != null ? (
          <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
            {meta}
          </span>
        ) : null}
      </div>
      {hint ? (
        <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
      {children}
    </div>
  );
}
