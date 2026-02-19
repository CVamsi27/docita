import { Eye, EyeOff, Loader2 } from "lucide-react";
import { ErrorBanner } from "@/components/error-banner";
import { FormField } from "@/components/form-field";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { BackEmailField, fieldClass, getFieldError, hasFieldError, InlineFieldError } from "./AuthSharedFields";
import type { FieldErrors } from "../types/auth";

interface SignupStepProps {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  showPassword: boolean;
  fieldErrors: FieldErrors;
  loading: boolean;
  error: string;
  onBack: () => void;
  onChangeFirstName: (value: string) => void;
  onChangeLastName: (value: string) => void;
  onChangePassword: (value: string) => void;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
}

export function AuthSignupStepUI({
  email,
  firstName,
  lastName,
  password,
  showPassword,
  fieldErrors,
  loading,
  error,
  onBack,
  onChangeFirstName,
  onChangeLastName,
  onChangePassword,
  onTogglePassword,
  onSubmit,
}: SignupStepProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <BackEmailField
        id="signup-email"
        value={email}
        fieldErrors={fieldErrors}
        onBack={onBack}
        errorId="signup-email-error"
      />

      <div className="grid grid-cols-2 gap-3">
        <FormField
          id="firstName"
          label="First Name"
          type="text"
          placeholder="John"
          value={firstName}
          onChange={onChangeFirstName}
          fieldErrors={fieldErrors}
          required
          autoFocus
        />
        <FormField
          id="lastName"
          label="Last Name"
          type="text"
          placeholder="Doe"
          value={lastName}
          onChange={onChangeLastName}
          fieldErrors={fieldErrors}
          required
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Registering a new clinic? Complete onboarding at <a href="/onboarding" className="underline">/onboarding</a> to accept SLA, choose plan/add-ons, and configure billing.
      </p>

      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <div className="relative">
          <Input
            id="signup-password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => onChangePassword(e.target.value)}
            required
            className={`pr-10 h-11 bg-background/50 ${fieldClass(fieldErrors, "password")}`}
            placeholder="••••••••"
            aria-invalid={hasFieldError(fieldErrors, "password")}
            aria-describedby={
              hasFieldError(fieldErrors, "password")
                ? "signup-password-error"
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
            id="signup-password-error"
            message={getFieldError(fieldErrors, "password")}
          />
        )}
        {!hasFieldError(fieldErrors, "password") && (
          <p className="text-xs text-muted-foreground">
            Must be 8+ characters with uppercase, lowercase, number, and
            special character
          </p>
        )}
      </div>

      {!Object.keys(fieldErrors).length && error && <ErrorBanner message={error} />}

      <Button
        type="submit"
        className="w-full h-11 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          "Create Account"
        )}
      </Button>
    </form>
  );
}
