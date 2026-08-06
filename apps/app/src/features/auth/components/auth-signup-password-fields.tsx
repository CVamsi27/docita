import { useTranslation } from "react-i18next";
import { Eye, EyeOff } from "lucide-react";
import { Button, Input, Label, SymbolTooltip } from "@workspace/ui/components";
import { hasFieldError, getFieldError } from "@/lib/utils/form-errors";
import { InlineFieldError, PasswordStrengthIndicator } from "./AuthSharedFields";
import { fieldClass } from "./auth-field-error-helpers";
import type { FieldErrors } from "../types/auth";

function renderPasswordInput({
  id,
  value,
  onChange,
  fieldName,
  placeholder,
  showPasswordLabel,
  showPassword,
  onTogglePassword,
  fieldErrors,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  fieldName: string;
  placeholder: string;
  showPasswordLabel: string;
  showPassword: boolean;
  onTogglePassword: () => void;
  fieldErrors: FieldErrors;
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="new-password"
        required
        className={`pr-10 h-11 bg-background/50 ${fieldClass(fieldErrors, fieldName)}`}
        placeholder={placeholder}
        aria-invalid={hasFieldError(fieldErrors, fieldName)}
        aria-describedby={
          hasFieldError(fieldErrors, fieldName) ? `${id}-error` : undefined
        }
      />
      <SymbolTooltip label={showPasswordLabel} side="left">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:text-foreground"
          onClick={onTogglePassword}
          aria-label={showPasswordLabel}
        >
          {showPassword ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>
      </SymbolTooltip>
    </div>
  );
}

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
  const { t } = useTranslation("Auth");
  const tSignIn = (key: string, options?: Record<string, unknown>) =>
    t(`signIn.${key}`, options);
  const showPasswordLabel = showPassword
    ? tSignIn("hidePassword")
    : tSignIn("showPassword");

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="signup-password">
          {tSignIn("passwordLabel")}
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        {renderPasswordInput({
          id: "signup-password",
          value: password,
          onChange: onChangePassword,
          fieldName: "password",
          placeholder: tSignIn("passwordPlaceholder"),
          showPasswordLabel,
          showPassword,
          onTogglePassword,
          fieldErrors,
        })}
        {hasFieldError(fieldErrors, "password") ? (
          <InlineFieldError
            id="signup-password-error"
            message={getFieldError(fieldErrors, "password")}
          />
        ) : null}
        <PasswordStrengthIndicator password={password} />
        {!hasFieldError(fieldErrors, "password") ? (
          <p className="text-xs text-muted-foreground">
            {tSignIn("passwordRequirementsHint")}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="signup-confirm-password">
          {tSignIn("confirmPasswordLabel")}
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        {renderPasswordInput({
          id: "signup-confirm-password",
          value: confirmPassword,
          onChange: onChangeConfirmPassword,
          fieldName: "confirmPassword",
          placeholder: tSignIn("confirmPasswordPlaceholder"),
          showPasswordLabel,
          showPassword,
          onTogglePassword,
          fieldErrors,
        })}
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