

import type { ApiErrorResponse, FormValidationErrors } from "@/lib/types/form";
import { getSafeUserMessage } from "@/lib/user-facing-errors";

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

    const message = getSafeUserMessage(
      data.detail,
      "Please check the highlighted fields and try again.",
    );

    return {
      message,
      fieldErrors,
    };
  } catch {
    return {
      message: "Please check the information and try again.",
      fieldErrors: {},
    };
  }
}

export function formatFieldError(error: unknown): string {
  if (typeof error === "string") {
    return getSafeUserMessage(error, "Please check this field.");
  }
  if (typeof error === "object" && error !== null) {
    const errorObj = toRecord(error);
    const message =
      typeof errorObj?.message === "string" ? errorObj.message : undefined;
    return getSafeUserMessage(message, "Please check this field.");
  }
  return "Please enter a valid value.";
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
