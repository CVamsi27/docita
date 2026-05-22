"use client";

import { Eye, EyeOff } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import {
  fieldClass,
  getFieldError,
  hasFieldError,
  InlineFieldError,
  PasswordStrengthIndicator,
} from "./AuthSharedFields";
import type { FieldErrors } from "@/features/auth/types/auth";

export function AuthSignupPasswordFields({
  password,
  confirmPassword,
  showPassword,
  fieldErrors,
  onChangePassword,
  onChangeConfirmPassword,
  onTogglePassword,
}: {
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  fieldErrors: FieldErrors;
  onChangePassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onTogglePassword: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="signup-password">
          Password
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <div className="relative">
          <Input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => onChangePassword(e.target.value)}
            autoComplete="new-password"
            required
            className={`pr-10 h-11 bg-background/50 ${fieldClass(fieldErrors, "password")}`}
            placeholder="Password"
            aria-invalid={hasFieldError(fieldErrors, "password")}
            aria-describedby={
              hasFieldError(fieldErrors, "password")
                ? "signup-password-error"
                : undefined
            }
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-1">
            <SymbolTooltip
              label={showPassword ? "Hide password" : "Show password"}
              side="left"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
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
        {hasFieldError(fieldErrors, "password") ? (
          <InlineFieldError
            id="signup-password-error"
            message={getFieldError(fieldErrors, "password")}
          />
        ) : null}
        <PasswordStrengthIndicator password={password} />
        {!hasFieldError(fieldErrors, "password") ? (
          <p className="text-xs text-muted-foreground">
            Must be 8+ characters with uppercase, lowercase, number, and special
            character
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-confirm-password">
          Confirm Password
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <div className="relative">
          <Input
            id="signup-confirm-password"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => onChangeConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
            className={`pr-10 h-11 bg-background/50 ${fieldClass(fieldErrors, "confirmPassword")}`}
            placeholder="Confirm password"
            aria-invalid={hasFieldError(fieldErrors, "confirmPassword")}
            aria-describedby={
              hasFieldError(fieldErrors, "confirmPassword")
                ? "signup-confirm-password-error"
                : undefined
            }
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-1">
            <SymbolTooltip
              label={showPassword ? "Hide password" : "Show password"}
              side="left"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-foreground"
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
        {hasFieldError(fieldErrors, "confirmPassword") ? (
          <InlineFieldError
            id="signup-confirm-password-error"
            message={getFieldError(fieldErrors, "confirmPassword")}
          />
        ) : null}
      </div>
    </div>
  );
}
