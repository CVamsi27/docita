import type { Request } from 'express';
import { getClientIp } from './client-ip';

function requestWith(headers: Request['headers']): Request {
  return {
    headers,
    ip: '10.0.0.9',
    socket: {
      remoteAddress: '10.0.0.10',
    },
  } as Request;
}

describe('getClientIp', () => {
  it('prefers the Cloudflare connecting IP header', () => {
    const request = requestWith({
      'cf-connecting-ip': '203.0.113.10',
      'x-forwarded-for': '198.51.100.5, 10.0.0.1',
    });

    expect(getClientIp(request)).toBe('203.0.113.10');
  });

  it('falls back to the first forwarded address', () => {
    const request = requestWith({
      'x-forwarded-for': '198.51.100.5, 10.0.0.1',
    });

    expect(getClientIp(request)).toBe('198.51.100.5');
  });

  it('uses Express IP when proxy headers are absent', () => {
    expect(getClientIp(requestWith({}))).toBe('10.0.0.9');
  });
});
