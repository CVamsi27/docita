"use client";

import * as React from "react";

import { cn } from "@workspace/ui/lib/utils";
import { Label } from "./label";

interface FieldRowProps {
  id?: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
  orientation?: "vertical" | "horizontal";
  children: React.ReactNode;
  className?: string;
}

export function FieldRow({
  id,
  label,
  description,
  error,
  required,
  htmlFor,
  orientation = "vertical",
  children,
  className,
}: FieldRowProps) {
  const descriptionId = description ? `${id ?? htmlFor ?? ""}-desc` : undefined;
  const errorId = error ? `${id ?? htmlFor ?? ""}-err` : undefined;

  return (
    <div
      className={cn(
        "min-w-0 space-y-1.5",
        orientation === "horizontal" && "grid grid-cols-[minmax(0,14rem)_minmax(0,1fr)] items-start gap-4 space-y-0",
        className,
      )}
    >
      {label ? (
        <Label
          htmlFor={htmlFor}
          className="text-[var(--fs-sm)] font-medium text-foreground"
        >
          {label}
          {required ? <span aria-hidden className="ml-0.5 text-destructive">*</span> : null}
        </Label>
      ) : null}
      <div className="min-w-0 space-y-1">
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
              "aria-describedby": [descriptionId, errorId].filter(Boolean).join(" ") || undefined,
              "aria-invalid": error ? true : undefined,
            })
          : children}
        {description && !error ? (
          <p id={descriptionId} className="text-[var(--fs-xs)] text-muted-foreground">
            {description}
          </p>
        ) : null}
        {error ? (
          <p id={errorId} className="text-[var(--fs-xs)] text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
