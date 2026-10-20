import { appointmentOverlapResponseSchema } from "@workspace/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseProblemDetailsFromJson(data: unknown): {
  detail?: string;
  message?: string;
  validationErrors?: Record<string, string>;
  raw: Record<string, unknown> | null;
} {
  if (!isRecord(data)) {
    return { raw: null };
  }

  const overlap = appointmentOverlapResponseSchema.safeParse(data);
  if (overlap.success) {
    return {
      detail: overlap.data.detail,
      validationErrors: overlap.data.validationErrors,
      raw: overlap.data,
    };
  }

  const detail =
    typeof data["detail"] === "string" ? data["detail"] : undefined;
  const message =
    typeof data["message"] === "string" ? data["message"] : undefined;
  const validationErrors = sanitizeValidationErrors(data["validationErrors"]);

  return {
    detail,
    message,
    ...(Object.keys(validationErrors).length > 0 ? { validationErrors } : {}),
    raw: data,
  };
}

function sanitizeValidationErrors(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  const formatted: Record<string, string> = {};
  for (const [field, message] of Object.entries(value)) {
    if (typeof message === "string") {
      formatted[field] = message;
    }
  }
  return formatted;
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Network error";
}
