"use client";

import type { ReactNode } from "react";
import {
  Input,
  Label
} from "@workspace/ui/components";

export interface ContactTextFieldProps {
  id: string;
  label: ReactNode;
  value: string;
  error?: string;
  onValueChange: (value: string) => void;
  autoComplete?: string;
  type?: string;
  wrapperClassName?: string;
}

/**
 * Label + input + inline-error block shared by the new-patient contact
 * fields (first name, last name, email) — each only differs in id, label,
 * value/change wiring, and input attributes.
 */
export function ContactTextField({
  id,
  label,
  value,
  error,
  onValueChange,
  autoComplete,
  type,
  wrapperClassName = "grid gap-2",
}: ContactTextFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className={wrapperClassName}>
      <Label
        htmlFor={id}
        className="text-[length:var(--fs-sm)] font-normal text-muted-foreground"
      >
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        autoComplete={autoComplete}
        type={type}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error ? (
        <p
          id={errorId}
          role="alert"
          className="text-[length:var(--fs-xs)] leading-snug text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
