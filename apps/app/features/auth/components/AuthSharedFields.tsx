"use client";

import { AlertCircle } from "lucide-react";
import { BackButton } from "@workspace/ui/components/back-button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import type { FieldErrors } from "@/features/auth/types/auth";

const PASSWORD_STRENGTH_LABELS = [
  "Very weak",
  "Weak",
  "Fair",
  "Good",
  "Strong",
  "Very strong",
];

function getPasswordScore(password: string): number {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function getBarColor(score: number, index: number): string {
  if (index >= score) return "bg-muted";
  if (score <= 1) return "bg-destructive";
  if (score <= 3) return "bg-warning";
  return "bg-success";
}

export function PasswordStrengthIndicator({
  password,
}: {
  password: string;
}) {
  if (!password) return null;
  const score = getPasswordScore(password);
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${getBarColor(score, i)}`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {PASSWORD_STRENGTH_LABELS[score]}
      </p>
    </div>
  );
}

export const hasFieldError = (fieldErrors: FieldErrors, field: string) =>
  Boolean(fieldErrors[field]);

export const getFieldError = (fieldErrors: FieldErrors, field: string) =>
  fieldErrors[field] ?? "";

export const fieldClass = (fieldErrors: FieldErrors, field: string) =>
  hasFieldError(fieldErrors, field)
    ? "border-destructive focus-visible:ring-destructive"
    : "";

export function InlineFieldError({
  id,
  message,
}: {
  id: string;
  message: string;
}) {
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
        <BackButton
          onBack={onBack}
          iconOnly
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          ariaLabel="Go back"
          tooltipLabel="Go back"
        />
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
