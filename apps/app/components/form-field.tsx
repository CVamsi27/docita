/**
 * Reusable form field component with built-in error handling
 * Follows the standardized validation pattern across the app
 */

import React from "react";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { AlertCircle } from "lucide-react";
import type { FormValidationErrors } from "@/lib/types/form";
import { getFieldError, hasFieldError } from "@/lib/utils/form-errors";

interface FormFieldProps {
  id: string;
  label: string;
  type?: "text" | "email" | "password" | "number" | "tel";
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  fieldErrors: FormValidationErrors;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  helpText?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  className?: string;
}

/**
 * FormField component provides consistent error display
 * Features:
 * - Red border when field has validation error
 * - Error message with icon below the input
 * - Help text when no error
 * - Accessible labels
 */
export const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      id,
      label,
      type = "text",
      placeholder,
      value,
      onChange,
      fieldErrors,
      required,
      disabled,
      autoFocus,
      helpText,
      pattern,
      minLength,
      maxLength,
      className,
    },
    ref
  ) => {
    const error = hasFieldError(fieldErrors, id);
    const errorMessage = getFieldError(fieldErrors, id);

    return (
      <div className="space-y-2">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>

        <Input
          ref={ref}
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          autoFocus={autoFocus}
          required={required}
          pattern={pattern}
          minLength={minLength}
          maxLength={maxLength}
          className={`
            h-11 bg-background/50
            ${error ? "border-destructive focus-visible:ring-destructive" : ""}
            ${className || ""}
          `}
          aria-invalid={error}
          aria-describedby={error ? `${id}-error` : undefined}
        />

        {error ? (
          <p
            id={`${id}-error`}
            className="text-xs text-destructive flex items-center gap-1"
          >
            <AlertCircle className="h-3 w-3 shrink-0" />
            {errorMessage}
          </p>
        ) : (
          helpText && (
            <p className="text-xs text-muted-foreground">{helpText}</p>
          )
        )}
      </div>
    );
  }
);

FormField.displayName = "FormField";
