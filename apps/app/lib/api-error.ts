/**
 * Custom error class for API validation errors.
 *
 * Carries field-level errors from the backend RFC 7807 response
 * so forms can display red highlighting on specific fields.
 *
 * Usage:
 *   try { await register(...) }
 *   catch (error) {
 *     if (error instanceof ApiValidationError) {
 *       setFieldErrors(error.fieldErrors);   // { email: "Invalid", password: "Too short" }
 *       setError(error.message);             // "Validation failed..."
 *     }
 *   }
 */
export class ApiValidationError extends Error {
  /** Map of field name → error message from backend Zod validation */
  readonly fieldErrors: Record<string, string>;
  /** HTTP status code */
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

  /** True if there are field-level errors to display inline */
  get hasFieldErrors(): boolean {
    return Object.keys(this.fieldErrors).length > 0;
  }
}

/**
 * Parse a non-ok API Response into an ApiValidationError or plain Error.
 *
 * Backend returns RFC 7807 Problem Details:
 * {
 *   "status": 400,
 *   "title": "Bad Request",
 *   "detail": "Validation failed. Please check the highlighted fields.",
 *   "validationErrors": { "email": "Invalid format", "password": "Too short" }
 * }
 */
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
