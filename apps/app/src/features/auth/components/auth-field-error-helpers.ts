import type { FieldErrors } from "../types/auth";

export const fieldClass = (fieldErrors: FieldErrors, field: string) =>
  fieldErrors[field]
    ? "border-destructive focus-visible:ring-destructive"
    : "";
