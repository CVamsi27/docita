"use client";

import { Eye, EyeOff } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { cn } from "@workspace/ui/lib/utils";
import { InlineFieldError, PasswordStrengthIndicator } from "./AuthSharedFields";

interface AuthPasswordFloatingFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  showPassword: boolean;
  onTogglePassword: () => void;
  autoComplete?: "new-password" | "current-password";
  autoFocus?: boolean;
  showStrength?: boolean;
  helperText?: string;
}

export function AuthPasswordFloatingField({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  showPassword,
  onTogglePassword,
  autoComplete = "new-password",
  autoFocus,
  showStrength = false,
  helperText,
}: AuthPasswordFloatingFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        <span className="text-destructive ml-0.5">*</span>
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          required
          placeholder={`Enter ${label.toLowerCase()}`}
          className={cn(
            "h-12 min-h-12 bg-background/50 pr-12",
            error && "border-destructive focus-visible:ring-destructive",
          )}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-1">
          <SymbolTooltip
            label={showPassword ? "Hide password" : "Show password"}
            side="left"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-12 text-muted-foreground hover:text-foreground"
              onClick={onTogglePassword}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </SymbolTooltip>
        </div>
      </div>
      {error ? <InlineFieldError id={errorId} message={error} /> : null}
      {showStrength ? <PasswordStrengthIndicator password={value} /> : null}
      {!error && helperText ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}
