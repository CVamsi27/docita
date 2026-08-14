import { isRecord } from '@workspace/utils';

function readStringField(
  row: Record<string, unknown>,
  key: string,
): string | undefined {
  return typeof row[key] === 'string' ? row[key] : undefined;
}

function formatErrorDetail(detail: unknown): string | null {
  if (!isRecord(detail)) return null;
  const line = [
    readStringField(detail, 'code'),
    readStringField(detail, 'target'),
    readStringField(detail, 'message'),
  ]
    .filter(Boolean)
    .join(': ');

  return line || null;
}

function collectNestedErrorParts(error: Record<string, unknown>): string[] {
  const parts: string[] = [];
  const message = readStringField(error, 'message');
  if (message) {
    parts.push(message);
  }

  if (Array.isArray(error.details)) {
    parts.push(
      ...error.details.flatMap((detail) => {
        const line = formatErrorDetail(detail);
        return line ? [line] : [];
      }),
    );
  }

  return parts;
}

function formatParsedZeptoMailError(
  parsed: Record<string, unknown>,
): string | null {
  if (isRecord(parsed.error)) {
    const parts = collectNestedErrorParts(parsed.error);
    if (parts.length > 0) return parts.join(' | ');
  }

  return readStringField(parsed, 'message') ?? null;
}

/** Normalizes ZeptoMail HTTP error bodies into a single log-safe string. */
export function formatZeptoMailErrorBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) return 'Empty ZeptoMail error response';

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!isRecord(parsed)) {
      return trimmed;
    }

    return formatParsedZeptoMailError(parsed) ?? trimmed;
  } catch {
    // Fall through to raw body.
  }

  return trimmed;
}
