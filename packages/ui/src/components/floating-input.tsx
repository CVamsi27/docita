"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import { Input } from "./input";

interface FloatingInputProps
  extends Omit<React.ComponentProps<typeof Input>, "id" | "placeholder"> {
  id: string;
  label: string;
  /** Renders a trailing asterisk on the label and sets `aria-required` on the input. */
  requiredMark?: boolean;
  helperText?: React.ReactNode;
  errorText?: React.ReactNode;
  containerClassName?: string;
  /**
   * Optional trailing slot (for example, an eye toggle on a password field).
   * Rendered absolutely on the right edge of the input.
   */
  trailing?: React.ReactNode;
}

/**
 * Origin-style floating-label input: the label sits inside the field at rest
 * and floats above on focus or when the field has a value. Uses the shared
 * Input primitive under the hood so styling stays consistent.
 */
export const FloatingInput = React.forwardRef<HTMLInputElement, FloatingInputProps>(
  function FloatingInput(
    {
      id,
      label,
      requiredMark,
      helperText,
      errorText,
      containerClassName,
      className,
      defaultValue,
      value,
      onChange,
      trailing,
      ...rest
    },
    ref,
  ) {
    const isControlled = value !== undefined;
    const [internalValue, setInternalValue] = React.useState<string>(
      typeof defaultValue === "string" ? defaultValue : "",
    );
    const currentValue = isControlled ? String(value ?? "") : internalValue;
    const hasValue = currentValue.length > 0;
    const helperId = helperText ? `${id}-helper` : undefined;
    const errorId = errorText ? `${id}-error` : undefined;

    return (
      <div className={cn("space-y-1.5", containerClassName)}>
        <div className="relative">
          <Input
            id={id}
            ref={ref}
            value={isControlled ? value : internalValue}
            defaultValue={isControlled ? undefined : defaultValue}
            placeholder=" "
            aria-describedby={
              [errorId, helperId].filter(Boolean).join(" ") || undefined
            }
            onChange={(event) => {
              if (!isControlled) {
                setInternalValue(event.target.value);
              }
              onChange?.(event);
            }}
            className={cn("peer pt-5 pb-1", trailing && "pr-10", className)}
            {...rest}
            aria-invalid={!!errorText || rest["aria-invalid"]}
            aria-required={
              requiredMark ? true : (rest["aria-required"] as boolean | undefined)
            }
          />
          <label
            htmlFor={id}
            className={cn(
              "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 origin-left text-sm text-muted-foreground transition-[color,font-size,font-weight,letter-spacing,text-transform,top,transform] duration-150",
              "peer-focus:top-2 peer-focus:translate-y-0 peer-focus:text-[var(--fs-2xs)] peer-focus:font-semibold peer-focus:uppercase peer-focus:tracking-wide peer-focus:text-foreground",
              hasValue &&
                "top-2 translate-y-0 text-[var(--fs-2xs)] font-semibold uppercase tracking-wide text-foreground",
            )}
          >
            {label}
            {requiredMark ? (
              <span aria-hidden className="text-destructive">
                {" "}
                *
              </span>
            ) : null}
          </label>
          {trailing ? (
            <div className="absolute right-0 top-0 flex h-full items-center pr-1">
              {trailing}
            </div>
          ) : null}
        </div>
        {errorText ? (
          <p id={errorId} className="text-sm text-destructive">
            {errorText}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-muted-foreground">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  },
);
