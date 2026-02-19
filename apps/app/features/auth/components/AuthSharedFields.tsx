import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import type { FieldErrors } from "../types/auth";

export const hasFieldError = (fieldErrors: FieldErrors, field: string) =>
  Boolean(fieldErrors[field]);

export const getFieldError = (fieldErrors: FieldErrors, field: string) =>
  fieldErrors[field] ?? "";

export const fieldClass = (fieldErrors: FieldErrors, field: string) =>
  hasFieldError(fieldErrors, field)
    ? "border-destructive focus-visible:ring-destructive"
    : "";

export function InlineFieldError({ id, message }: { id: string; message: string }) {
  return (
    <p id={id} className="text-xs text-destructive flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {message}
    </p>
  );
}

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
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-muted-foreground">
        Email Address
      </Label>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={onBack}
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <Input
            id={id}
            type="email"
            value={value}
            disabled
            className={`h-11 bg-muted/50 ${fieldClass(fieldErrors, "email")}`}
            aria-invalid={hasFieldError(fieldErrors, "email")}
            aria-describedby={
              hasFieldError(fieldErrors, "email") ? errorId : undefined
            }
          />
          {hasFieldError(fieldErrors, "email") && (
            <div className="mt-1">
              <InlineFieldError
                id={errorId}
                message={getFieldError(fieldErrors, "email")}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
