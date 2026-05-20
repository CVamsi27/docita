import type { Request } from 'express';

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

export function getClientIp(request: Request): string {
  return (
    firstForwardedForIp(
      firstHeaderValue(request.headers['cf-connecting-ip']),
    ) ??
    firstForwardedForIp(firstHeaderValue(request.headers['x-real-ip'])) ??
    firstForwardedForIp(firstHeaderValue(request.headers['x-forwarded-for'])) ??
    request.ip ??
    request.socket.remoteAddress ??
    'unknown'
  );
}
