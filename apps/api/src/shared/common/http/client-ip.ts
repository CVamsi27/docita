import type { Request } from 'express';

/** Minimal request shape for IP extraction (Express + Nest throttler). */
type ClientIpRequest = {
  headers?: Request['headers'];
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
};

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

function firstHeaderValue(
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

function firstForwardedForIp(value: string | undefined): string | undefined {
  const candidate = value?.split(',')[0]?.trim();
  return candidate && candidate.length > 0 ? candidate : undefined;
}

export function getClientIp(request: ClientIpRequest): string {
  const headers = request.headers ?? {};

  return (
    firstForwardedForIp(firstHeaderValue(headers['cf-connecting-ip'])) ??
    firstForwardedForIp(firstHeaderValue(headers['x-real-ip'])) ??
    firstForwardedForIp(firstHeaderValue(headers['x-forwarded-for'])) ??
    request.ip ??
    request.socket?.remoteAddress ??
    'unknown'
  );
}
