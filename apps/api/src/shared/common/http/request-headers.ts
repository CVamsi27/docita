import type { Request } from 'express';

export function firstHeaderValue(
  value: string | string[] | undefined,
): string | undefined {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && value.length > 0) {
    return value.find((entry) => entry.trim().length > 0);
  }

  return undefined;
}

export function readRequestHeaderString(
  headers: Request['headers'] | undefined,
  name: string,
): string | undefined {
  if (!headers) {
    return undefined;
  }

  const normalized = name.toLowerCase();
  return firstHeaderValue(headers[normalized] ?? headers[name]);
}
