import type { Request } from 'express';
import { isCloudflareIp } from './cloudflare-ips';
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
  const peerIp = request.ip ?? request.socket?.remoteAddress;

  // Production: the API origin (Fly.io) is directly reachable on the
  // internet, so CF-Connecting-IP / X-Real-IP / X-Forwarded-For are only
  // trustworthy when the direct socket peer is a Cloudflare edge IP
  // (Cloudflare overwrites CF-Connecting-IP at the edge; a client that
  // bypasses Cloudflare can set all three headers freely, which would let
  // it rotate the per-IP throttle key — the OTP 5/min and partner 60/20
  // limits). Direct-to-origin traffic falls back to the real peer IP, so
  // per-IP limits stay scoped and unspoofable. Non-production (Render
  // staging, local dev behind a proxy) keeps the legacy chain unchanged.
  if (process.env.NODE_ENV === 'production') {
    if (!peerIp || !isCloudflareIp(peerIp)) {
      return peerIp ?? 'unknown';
    }
    return (
      firstForwardedForIp(firstHeaderValue(headers['cf-connecting-ip'])) ??
      firstForwardedForIp(firstHeaderValue(headers['x-real-ip'])) ??
      firstForwardedForIp(firstHeaderValue(headers['x-forwarded-for'])) ??
      peerIp
    );
  }

  return (
    firstForwardedForIp(firstHeaderValue(headers['cf-connecting-ip'])) ??
    firstForwardedForIp(firstHeaderValue(headers['x-real-ip'])) ??
    firstForwardedForIp(firstHeaderValue(headers['x-forwarded-for'])) ??
    peerIp ??
    'unknown'
  );
}
