

import type { ApiErrorResponse, FormValidationErrors } from "@/lib/types/form";

function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  return Object.fromEntries(Object.entries(value));
}

export async function parseApiError(response: Response): Promise<{
  message: string;
  fieldErrors: FormValidationErrors;
}> {
  try {
    const data = (await response.json()) as ApiErrorResponse;

    const fieldErrors = data.validationErrors || {};

    const message =
      data.detail || "An error occurred. Please check the highlighted fields.";

    return {
      message,
      fieldErrors,
    };
  } catch {

    return {
      message: "An error occurred. Please try again.",
      fieldErrors: {},
    };
  }
}

export function formatFieldError(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "object" && error !== null) {
    const errorObj = toRecord(error);
    return String(errorObj?.message || error);
  }
  return "Invalid input";
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
