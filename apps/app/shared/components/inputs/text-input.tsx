import * as React from "react";
import { cn } from "@workspace/ui/lib/utils";
import { Input as BaseInput, Label } from "@workspace/ui/components";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, helperText, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <Label className="mb-2 block text-sm font-medium text-foreground">
          {label}
        </Label>
      )}
      <BaseInput
        type={type}
        className={cn(
          error && "border-destructive focus-visible:ring-destructive",
          className,
        )}
        ref={ref}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
      {helperText && !error && (
        <p className="mt-1 text-sm text-muted-foreground">{helperText}</p>
      )}
    </div>
  ),
);
Input.displayName = "Input";

export { Input };
