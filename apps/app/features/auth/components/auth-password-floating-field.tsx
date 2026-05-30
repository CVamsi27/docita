"use client";

import { Eye, EyeOff } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { FloatingInput } from "@workspace/ui/components/form/floating-input";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { PasswordStrengthIndicator } from "./AuthSharedFields";

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
  return (
    <div className="space-y-2">
      <FloatingInput
        id={id}
        label={label}
        type={showPassword ? "text" : "password"}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        requiredMark
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        errorText={error}
        className="h-12"
        trailing={
          <SymbolTooltip
            label={showPassword ? "Hide password" : "Show password"}
            side="left"
          >
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
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
        }
      />
      {showStrength ? <PasswordStrengthIndicator password={value} /> : null}
      {!error && helperText ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}
