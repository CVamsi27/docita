import { Eye, EyeOff, Loader2 } from "lucide-react";
import { ErrorBanner } from "@/components/common/error-banner";
import { FormField } from "@/components/common/form-field";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/radio-group";
import { cn } from "@workspace/ui/lib/utils";
import {
  BackEmailField,
  fieldClass,
  getFieldError,
  hasFieldError,
  InlineFieldError,
  PasswordStrengthIndicator,
} from "./AuthSharedFields";
import type { FieldErrors } from "@/features/auth/types/auth";

interface SignupStepProps {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  ownerRole: "ADMIN" | "ADMIN_DOCTOR" | null;
  showPassword: boolean;
  fieldErrors: FieldErrors;
  loading: boolean;
  error: string;
  onBack: () => void;
  onChangeFirstName: (value: string) => void;
  onChangeLastName: (value: string) => void;
  onChangePassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  onChangeOwnerRole: (value: "ADMIN" | "ADMIN_DOCTOR") => void;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
}

const OWNER_ROLE_OPTIONS = [
  {
    value: "ADMIN_DOCTOR" as const,
    roleLabel: "Admin Doctor",
    title: "Yes, I'll also see patients",
    description:
      "Use consultations, prescriptions, notes, and facility management from the same owner account",
    helper:
      "This creates an Admin Doctor account with clinical and facility-management access",
    badge: "Recommended",
  },
  {
    value: "ADMIN" as const,
    roleLabel: "Admin",
    title: "No, I'll only manage the facility",
    description:
      "Use billing, facility setup, team management, and operational tools without doctor workflows",
    helper:
      "This creates an Admin account focused on facility operations and staff management",
  },
];

export function AuthSignupStepUI({
  email,
  firstName,
  lastName,
  password,
  confirmPassword,
  ownerRole,
  showPassword,
  fieldErrors,
  loading,
  error,
  onBack,
  onChangeFirstName,
  onChangeLastName,
  onChangePassword,
  onChangeConfirmPassword,
  onChangeOwnerRole,
  onTogglePassword,
  onSubmit,
}: SignupStepProps) {
  const selectedOwnerRole =
    OWNER_ROLE_OPTIONS.find((option) => option.value === ownerRole) ?? null;
  const ownerRoleError = getFieldError(fieldErrors, "ownerRole");
  const hasGlobalError = !Object.keys(fieldErrors).length && Boolean(error);

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <BackEmailField
        id="signup-email"
        value={email}
        fieldErrors={fieldErrors}
        onBack={onBack}
        errorId="signup-email-error"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField
          id="firstName"
          label="First Name"
          type="text"
          placeholder="First name"
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
          placeholder="Last name"
          value={lastName}
          onChange={onChangeLastName}
          fieldErrors={fieldErrors}
          required
        />
      </div>

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
          <PasswordStrengthIndicator password={password} />
          {!hasFieldError(fieldErrors, "password") && (
            <p className="text-xs text-muted-foreground">
              Must be 8+ characters with uppercase, lowercase, number, and special
              character
            </p>
          )}
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
          {hasFieldError(fieldErrors, "confirmPassword") && (
            <InlineFieldError
              id="signup-confirm-password-error"
              message={getFieldError(fieldErrors, "confirmPassword")}
            />
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label id="signup-owner-role-label">
            Will you personally treat patients with this account?
            <span className="text-destructive ml-0.5">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            Choose the setup that matches how you will use Docita on day one
          </p>
        </div>

        <RadioGroup
          aria-labelledby="signup-owner-role-label"
          aria-invalid={hasFieldError(fieldErrors, "ownerRole")}
          aria-describedby={
            hasFieldError(fieldErrors, "ownerRole")
              ? "signup-owner-role-error"
              : "signup-owner-role-hint"
          }
          value={ownerRole ?? ""}
          onValueChange={(value) =>
            onChangeOwnerRole(value as "ADMIN" | "ADMIN_DOCTOR")
          }
          className="grid gap-2.5 xl:grid-cols-2"
        >
          {OWNER_ROLE_OPTIONS.map((option) => {
            const inputId = `signup-owner-role-${option.value.toLowerCase()}`;
            const isSelected = ownerRole === option.value;

            return (
              <Label
                key={option.value}
                htmlFor={inputId}
                className={cn(
                  "flex h-full cursor-pointer rounded-lg border border-border/60 bg-background/50 px-4 py-3 transition-colors",
                  "hover:bg-muted/20",
                  isSelected && "border-primary/40 bg-muted/30",
                )}
              >
                <div className="flex w-full items-start gap-3">
                  <RadioGroupItem
                    id={inputId}
                    value={option.value}
                    className="mt-1 shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {option.title}
                      </p>
                      {option.badge ? (
                        <Badge variant="secondary">{option.badge}</Badge>
                      ) : null}
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {option.roleLabel} account
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {option.description}
                    </p>
                  </div>
                </div>
              </Label>
            );
          })}
        </RadioGroup>

        <p
          id="signup-owner-role-hint"
          className="text-xs text-muted-foreground"
        >
          {selectedOwnerRole
            ? `${selectedOwnerRole.helper} You can update permissions later in Settings`
            : "Choose one answer to continue and you can change roles later in Settings"}
        </p>

        {ownerRoleError && (
          <InlineFieldError
            id="signup-owner-role-error"
            message={ownerRoleError}
          />
        )}
      </div>

      {hasGlobalError && <ErrorBanner message={error} />}

      <Button
        type="submit"
        className="w-full h-11 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
        disabled={loading || !ownerRole}
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
