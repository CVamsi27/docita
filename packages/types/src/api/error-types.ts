

export interface ErrorWithMessage {
  message: string;
  stack?: string;
  code?: string;
  name?: string;
}

export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  const errorObj =
    typeof error === "object" && error !== null && !Array.isArray(error)
      ? Object.fromEntries(Object.entries(error))
      : null;

  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof errorObj?.message === "string"
  );
}

export function toErrorWithMessage(error: unknown): ErrorWithMessage {
  if (isErrorWithMessage(error)) {
    return {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name,
    };
  }

  try {
    return { message: JSON.stringify(error) };
  } catch {

    return { message: String(error) };
  }
}

export function getErrorMessage(error: unknown): string {
  return toErrorWithMessage(error).message;
}
