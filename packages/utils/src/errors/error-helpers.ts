export interface ErrorWithMessage {
  message: string;
  stack?: string;
  code?: string;
  name?: string;
}

export function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  );
}

export function toErrorWithMessage(error: unknown): ErrorWithMessage {
  if (isErrorWithMessage(error)) {
    const out: ErrorWithMessage = { message: error.message };
    if (error.stack !== undefined) out.stack = error.stack;
    if (error.code !== undefined) out.code = error.code;
    if (error.name !== undefined) out.name = error.name;
    return out;
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
