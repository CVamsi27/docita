import { AlertCircle } from "lucide-react";
import type { FieldErrors } from "../types/auth";

export const fieldClass = (fieldErrors: FieldErrors, field: string) =>
  fieldErrors[field]
    ? "border-destructive focus-visible:ring-destructive"
    : "";

export function InlineFieldError({
  id: _id,
  message,
}: {
  id: string;
  message: string;
}) {
  return (
    <p id={_id} className="text-xs text-destructive flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {message}
    </p>
  );
}
