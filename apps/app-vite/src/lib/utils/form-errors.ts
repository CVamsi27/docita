import type { FormValidationErrors } from "@/lib/types/form";
import { getSafeUserMessage } from "@/lib/errors/user-facing-errors";
import { isRecord } from "@workspace/utils";

function formatFieldError(error: unknown): string {
  if (typeof error === "string") return getSafeUserMessage(error, "Please check this field");
  if (isRecord(error)) {
    const message =
      typeof error.message === "string" ? error.message : undefined;
    return getSafeUserMessage(message, "Please check this field");
  }
  return "Please enter a valid value";
}

export function hasFieldError(
  fieldErrors: FormValidationErrors,
  fieldName: string,
): boolean {
  return fieldName in fieldErrors;
}

export function getFieldError(
  fieldErrors: FormValidationErrors,
  fieldName: string,
): string {
  const error = fieldErrors[fieldName];
  if (!error) return "";
  return formatFieldError(error);
}