import { Loader2 } from "lucide-react";
import { ErrorBanner } from "@/components/common/error-banner";
import { FormField } from "@/components/common/form-field";
import { Button } from "@workspace/ui/components/button";
import type { FieldErrors } from "@/features/auth/types/auth";

interface EmailStepProps {
  email: string;
  fieldErrors: FieldErrors;
  loading: boolean;
  error: string;
  onChangeEmail: (value: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
}

export function AuthEmailStepUI({
  email,
  fieldErrors,
  loading,
  error,
  onChangeEmail,
  onSubmit,
}: EmailStepProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <FormField
        id="email"
        type="email"
        label="Email Address"
        placeholder="Email"
        value={email}
        onChange={onChangeEmail}
        fieldErrors={fieldErrors}
        required
        autoFocus
      />

      {!Object.keys(fieldErrors).length && error && (
        <ErrorBanner message={error} />
      )}

      <Button
        type="submit"
        size="pill"
        className="w-full"
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Checking...
          </>
        ) : (
          "Continue"
        )}
      </Button>
    </form>
  );
}
