import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { ErrorBanner } from "@/components/errors/error-banner";
import { FormField } from "@/components/form-field";
import { Button } from "@workspace/ui/components/form/button";
import { BackEmailField } from "./AuthSharedFields";
import type { FieldErrors } from "../types/auth";
import { AuthSignupPasswordFields } from "./auth-signup-password-fields";
import { AuthSignupOwnerRoleFields } from "./auth-signup-owner-role-fields";

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
          label="First name"
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
          label="Last name"
          type="text"
          placeholder="Last name"
          value={lastName}
          onChange={onChangeLastName}
          fieldErrors={fieldErrors}
          required
        />
      </div>

      <AuthSignupPasswordFields
        password={password}
        confirmPassword={confirmPassword}
        showPassword={showPassword}
        fieldErrors={fieldErrors}
        onChangePassword={onChangePassword}
        onChangeConfirmPassword={onChangeConfirmPassword}
        onTogglePassword={onTogglePassword}
      />

      <AuthSignupOwnerRoleFields
        ownerRole={ownerRole}
        fieldErrors={fieldErrors}
        onChangeOwnerRole={onChangeOwnerRole}
      />

      {hasGlobalError ? <ErrorBanner message={error} /> : null}

      <Button
        type="submit"
        className="w-full h-11 text-base shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
        disabled={loading || !ownerRole}
      >
        {loading ? (
          <>
            <DocitaLoadingIndicator
              variant="inline"
              decorative
              className="mr-2"
            />
            Creating account…
          </>
        ) : (
          "Create Account"
        )}
      </Button>
    </form>
  );
}