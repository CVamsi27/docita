import { BackButton, Input, Label } from "@workspace/ui/components";
import { InlineFieldError } from "./auth-field-error";
import { fieldClass } from "./auth-field-error-helpers";
import type { FieldErrors } from "../types/auth";

interface BackEmailFieldProps {
  id: string;
  value: string;
  fieldErrors: FieldErrors;
  onBack: () => void;
  errorId: string;
}

export function BackEmailField({
  id,
  value,
  fieldErrors,
  onBack,
  errorId,
}: BackEmailFieldProps) {
  const hasEmailError = fieldErrors["email"];
  const emailError = fieldErrors["email"] ?? "";
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-muted-foreground">
        Email Address
      </Label>
      <div className="flex items-center gap-2">
        <BackButton
          onBack={onBack}
          iconOnly
          variant="ghost"
          size="icon"
          className="size-12 shrink-0"
          ariaLabel="Go back"
          tooltipLabel="Go back"
        />
        <div className="flex-1">
          <Input
            id={id}
            type="email"
            value={value}
            disabled
            className={`h-12 min-h-12 bg-muted/50 ${fieldClass(fieldErrors, "email")}`}
            aria-invalid={Boolean(hasEmailError)}
            aria-describedby={
              hasEmailError ? errorId : undefined
            }
          />
          {hasEmailError && (
            <div className="mt-1">
              <InlineFieldError
                id={errorId}
                message={emailError}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
