import type { FormValidationErrors } from "@/lib/types/form";
import { getSafeUserMessage } from "@/lib/errors/user-facing-errors";
import { isRecord } from "@workspace/utils";

function parseFormValidationErrors(value: unknown): FormValidationErrors {
  if (!isRecord(value)) {
    return {};
  }

  const fieldErrors: FormValidationErrors = {};
  for (const [field, entry] of Object.entries(value)) {
    if (typeof entry === "string") {
      fieldErrors[field] = entry;
      continue;
    }
    if (isRecord(entry) && typeof entry.message === "string") {
      fieldErrors[field] = {
        message: entry.message,
        ...(typeof entry.code === "string" ? { code: entry.code } : {}),
      };
    }
  }
  return fieldErrors;
}

export async function parseApiError(response: Response): Promise<{
  message: string;
  fieldErrors: FormValidationErrors;
}> {
  try {
    const data: unknown = await response.json();
    const fieldErrors =
      isRecord(data) ? parseFormValidationErrors(data.validationErrors) : {};

    const message = getSafeUserMessage(
      isRecord(data) && typeof data.detail === "string" ? data.detail : undefined,
      "Please check the highlighted fields and try again",
    );

    return {
      message,
      fieldErrors,
    };
  } catch {
    return {
      message: "Please check the information and try again",
      fieldErrors: {},
    };
  }
}

export function formatFieldError(error: unknown): string {
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