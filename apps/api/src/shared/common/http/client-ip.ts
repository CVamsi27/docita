import type { Request } from 'express';
import { firstHeaderValue } from './request-headers';

/** Minimal request shape for IP extraction (Express + Nest throttler). */
type ClientIpRequest = {
  headers?: Request['headers'];
  ip?: string;
  socket?: {
    remoteAddress?: string;
  };
};

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
