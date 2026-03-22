import { Eye, EyeOff, Loader2 } from "lucide-react";
import { ErrorBanner } from "@/components/common/error-banner";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  BackEmailField,
  fieldClass,
  getFieldError,
  hasFieldError,
  InlineFieldError,
} from "./AuthSharedFields";
import type { FieldErrors } from "@/features/auth/types/auth";

interface LoginStepProps {
  email: string;
  password: string;
  showPassword: boolean;
  fieldErrors: FieldErrors;
  loading: boolean;
  error: string;
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
          <Label htmlFor="password">Password</Label>
          <Button
            variant="link"
            className="px-0 h-auto text-xs font-normal"
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
            required
            className={`pr-10 h-11 bg-background/50 ${fieldClass(fieldErrors, "password")}`}
            placeholder="••••••••"
            autoFocus
            aria-invalid={hasFieldError(fieldErrors, "password")}
            aria-describedby={
              hasFieldError(fieldErrors, "password")
                ? "login-password-error"
                : undefined
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:text-foreground"
            onClick={onTogglePassword}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            <span className="sr-only">
              {showPassword ? "Hide password" : "Show password"}
            </span>
          </Button>
        </div>
        {hasFieldError(fieldErrors, "password") && (
          <InlineFieldError
            id="login-password-error"
            message={getFieldError(fieldErrors, "password")}
          />
        )}
      </div>

      {!Object.keys(fieldErrors).length && error && (
        <ErrorBanner message={error} />
      )}

      <Button
        type="submit"
        className="w-full h-11 text-base shadow-md hover:shadow-lg transition-shadow"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
}
