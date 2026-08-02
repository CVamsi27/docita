import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { ErrorBanner } from "@/components/errors/error-banner";
import { FormField } from "@/components/form-field";
import { Button } from "@workspace/ui/components/form/button";
import type { FieldErrors } from "../types/auth";

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
        label="Email address"
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
            <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
            Checking…
          </>
        ) : (
          "Continue"
        )}
      </Button>
    </form>
  );
}