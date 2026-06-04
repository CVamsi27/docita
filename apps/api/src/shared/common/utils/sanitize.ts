// check-as-cast-density: allow-file — narrowing casts required by generic signatures or external SDK types
const HTML_TAG_RE = /<[^>]*>/g;
const JS_EVENT_RE = /\bon\w+\s*=\s*['"]?[^'"\s]+['"]?/gi;
const JS_URL_RE = /javascript\s*:/gi;

export function sanitizeString(value: string): string {
  return value
    .replace(HTML_TAG_RE, '')
    .replace(JS_EVENT_RE, '')
    .replace(JS_URL_RE, '');
}

export function sanitizeInput<T>(value: T): T {
  if (typeof value === 'string') {
    return sanitizeString(value) as T;
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeInput) as T;
  }
  if (value && typeof value === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      sanitized[key] = sanitizeInput(val);
    }
    return sanitized as T;
  }
  return value;
}
