import {
  getUserFacingErrorMessage,
  sanitizeUserFacingMessage,
} from "@workspace/types";

export class ApiValidationError extends Error {
  readonly fieldErrors: Record<string, string>;

  readonly status: number;

  constructor(
    message: string,
    fieldErrors: Record<string, string>,
    status = 400,
  ) {
    super(message);
    this.name = "ApiValidationError";
    this.fieldErrors = fieldErrors;
    this.status = status;
  }

  get hasFieldErrors(): boolean {
    return Object.keys(this.fieldErrors).length > 0;
  }
}

function sanitizeFieldErrors(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([field, message]) => {
      if (typeof message !== "string") {
        return [];
      }
      return [[field, sanitizeUserFacingMessage(message, "Please check this field")]];
    }),
  );
}

export async function parseApiErrorResponse(
  response: Response,
  fallbackMessage = "Please review the information on this screen and try again",
): Promise<ApiValidationError | Error> {
  try {
    const data = await response.json();
    const fieldErrors = sanitizeFieldErrors(data.validationErrors);
    const message = getUserFacingErrorMessage(
      {
        status: response.status,
        data: {
          ...data,
          message: data.detail || data.message,
        },
      },
      { fallback: fallbackMessage, context: "form" },
    );

    if (Object.keys(fieldErrors).length > 0) {
      return new ApiValidationError(message, fieldErrors, response.status);
    }

    return new Error(message);
  } catch {
    return new Error(fallbackMessage);
  }
}
