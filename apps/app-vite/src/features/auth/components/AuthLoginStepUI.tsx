import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { ErrorBanner } from "@/components/errors/error-banner";
import { Button, Input, Label, SymbolTooltip } from "@workspace/ui/components";
import { hasFieldError, getFieldError } from "@/lib/utils/form-errors";
import { BackEmailField, fieldClass, InlineFieldError } from "./AuthSharedFields";
import type { FieldErrors } from "../types/auth";

interface LoginStepProps {
  email: string;
  password: string;
  showPassword: boolean;
  fieldErrors: FieldErrors;
  loading: boolean;
  error: string;
  isLocked: boolean;
  lockoutMessage: string;
  onBack: () => void;
  onChangePassword: (value: string) => void;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  onForgotPassword: () => void;
}

export function AuthLoginStepUI({
  email,
  password,
  showPassword,
  fieldErrors,
  loading,
  error,
  isLocked,
  lockoutMessage,
  onBack,
  onChangePassword,
  onTogglePassword,
  onSubmit,
  onForgotPassword,
}: LoginStepProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <BackEmailField
        id="login-email"
        value={email}
        fieldErrors={fieldErrors}
        onBack={onBack}
        errorId="login-email-error"
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">
            Password
            <span className="text-destructive ml-0.5">*</span>
          </Label>
          <Button
            variant="link"
            className="min-h-12 px-2 text-xs font-normal"
            tabIndex={-1}
            type="button"
            onClick={onForgotPassword}
          >
            Forgot password?
          </Button>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => onChangePassword(e.target.value)}
            autoComplete="current-password"
            required
            className={`pr-12 h-12 min-h-12 bg-background/50 ${fieldClass(fieldErrors, "password")}`}
            placeholder="Password"
            autoFocus
            aria-invalid={hasFieldError(fieldErrors, "password")}
            aria-describedby={
              hasFieldError(fieldErrors, "password")
                ? "login-password-error"
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
        {hasFieldError(fieldErrors, "password") && (
          <InlineFieldError
            id="login-password-error"
            message={getFieldError(fieldErrors, "password")}
          />
        )}
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Secure workspace sign-in with encrypted sessions and account lockout
          protection
        </p>
      </div>

      {isLocked && lockoutMessage && (
        <div className="surface-warning rounded-lg px-3 py-2 text-sm">
          {lockoutMessage}
        </div>
      )}

      {!Object.keys(fieldErrors).length && error && (
        <ErrorBanner message={error} />
      )}

      <Button
        type="submit"
        className="w-full h-12 min-h-12 text-base shadow-md hover:shadow-lg transition-shadow"
        disabled={loading || isLocked || password.trim().length === 0}
      >
        {loading ? (
          <>
            <DocitaLoadingIndicator
              variant="inline"
              decorative
              className="mr-2"
            />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}