/**
 * Form error utility functions
 */

import type { ApiErrorResponse, FormValidationErrors } from "@/lib/types/form";

/**
 * Parses API error response and extracts field-level validation errors
 * Following RFC 7807 Problem Details format with validationErrors field
 */
export async function parseApiError(response: Response): Promise<{
  message: string;
  fieldErrors: FormValidationErrors;
}> {
  try {
    const data = (await response.json()) as ApiErrorResponse;

    // Extract field-level validation errors from validationErrors field
    const fieldErrors = data.validationErrors || {};

    // Use detail message if available, otherwise use a generic message
    const message =
      data.detail || "An error occurred. Please check the highlighted fields.";

    return {
      message,
      fieldErrors,
    };
  } catch {
    // If response is not JSON, fallback to status text
    return {
      message: "An error occurred. Please try again.",
      fieldErrors: {},
    };
  }
}

/**
 * Converts validation error object to a format suitable for form field display
 */
export function formatFieldError(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (typeof error === "object" && error !== null) {
    const errorObj = error as Record<string, unknown>;
    return String(errorObj.message || error);
  }
  return "Invalid input";
}

/**
 * Helper to check if a field has an error
 */
export function hasFieldError(
  fieldErrors: FormValidationErrors,
  fieldName: string,
): boolean {
  return fieldName in fieldErrors;
}

/**
 * Helper to get field error message
 */
export function getFieldError(
  fieldErrors: FormValidationErrors,
  fieldName: string,
): string {
  const error = fieldErrors[fieldName];
  if (!error) return "";
  return formatFieldError(error);
}
