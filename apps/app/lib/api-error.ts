
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

export async function parseApiErrorResponse(
  response: Response,
  fallbackMessage = "An error occurred",
): Promise<ApiValidationError | Error> {
  try {
    const data = await response.json();
    const message = data.detail || data.message || fallbackMessage;
    const fieldErrors = data.validationErrors || {};

    if (
      typeof fieldErrors === "object" &&
      Object.keys(fieldErrors).length > 0
    ) {
      return new ApiValidationError(message, fieldErrors, response.status);
    }

    return new Error(message);
  } catch {
    return new Error(fallbackMessage);
  }
}
