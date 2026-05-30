import { isRecord } from '@workspace/utils';

/** Normalizes ZeptoMail HTTP error bodies into a single log-safe string. */
export function formatZeptoMailErrorBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) {
    return 'Empty ZeptoMail error response';
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (!isRecord(parsed)) {
      return trimmed;
    }

    if (isRecord(parsed.error)) {
      const parts: string[] = [];
      if (typeof parsed.error.message === 'string') {
        parts.push(parsed.error.message);
      }
      if (Array.isArray(parsed.error.details)) {
        for (const detail of parsed.error.details) {
          if (!isRecord(detail)) continue;
          const code =
            typeof detail.code === 'string' ? detail.code : undefined;
          const message =
            typeof detail.message === 'string' ? detail.message : undefined;
          const target =
            typeof detail.target === 'string' ? detail.target : undefined;
          const line = [code, target, message].filter(Boolean).join(': ');
          if (line) parts.push(line);
        }
      }
      if (parts.length > 0) {
        return parts.join(' | ');
      }
    }

    if (typeof parsed.message === 'string') {
      return parsed.message;
    }
  } catch {
    // Fall through to raw body.
  }

  return trimmed;
}
