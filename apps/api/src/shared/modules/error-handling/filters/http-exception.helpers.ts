import { ZodIssue, ZodError } from 'zod';

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const getErrorCause = (value: unknown): unknown => {
  if (!isObject(value) || !('cause' in value)) {
    return undefined;
  }
  return value.cause;
};

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
};

const toStringOrUndefined = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

export function formatZodIssuesToFieldMap(
  issues: readonly ZodIssue[],
): Record<string, string> {
  const formatted: Record<string, string> = {};
  for (const issue of issues) {
    formatted[issue.path.join('.')] = issue.message;
  }
  return formatted;
}

export function resolveHttpExceptionMessage(
  exceptionResponse: unknown,
  fallback: string,
): { message: string; details?: string[] } {
  if (typeof exceptionResponse === 'string') {
    return { message: exceptionResponse };
  }

  if (!isObject(exceptionResponse)) {
    return { message: fallback };
  }

  const rawMessage = exceptionResponse.message;
  if (Array.isArray(rawMessage)) {
    const details = toStringArray(rawMessage);
    const errorLabel = toStringOrUndefined(exceptionResponse.error);
    return {
      message: details.join(', ') || errorLabel || fallback,
      details,
    };
  }

  const singleMessage = toStringOrUndefined(rawMessage);
  const errorLabel = toStringOrUndefined(exceptionResponse.error);
  return { message: singleMessage ?? errorLabel ?? fallback };
}

export function readZodIssuesFromCause(
  cause: unknown,
): readonly ZodIssue[] | null {
  return cause instanceof ZodError ? cause.issues : null;
}
