import type { Request } from 'express';
import { getClientIp } from './client-ip';
import { isCloudflareIp } from './cloudflare-ips';

const PRODUCTION = 'production';
const PREVIOUS_NODE_ENV = process.env.NODE_ENV;

function requestWith(headers: Request['headers']): Request {
  return {
    headers,
    ip: '10.0.0.9',
    socket: {
      remoteAddress: '10.0.0.10',
    },
  } as Request;
}

function requestWithPeer(headers: Request['headers'], peerIp: string): Request {
  return {
    headers,
    ip: peerIp,
    socket: {
      remoteAddress: peerIp,
    },
  } as Request;
}

function inProduction<T>(fn: () => T): T {
  process.env.NODE_ENV = PRODUCTION;
  try {
    return fn();
  } finally {
    if (PREVIOUS_NODE_ENV === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = PREVIOUS_NODE_ENV;
    }
  }
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

  describe('in production (directly reachable origin)', () => {
    it('trusts CF-Connecting-IP only when the peer is a Cloudflare IP', () => {
      inProduction(() => {
        const viaCloudflare = requestWithPeer(
          { 'cf-connecting-ip': '203.0.113.10' },
          // 104.16.0.0/13 is a published Cloudflare range.
          '104.16.200.1',
        );
        expect(getClientIp(viaCloudflare)).toBe('203.0.113.10');
      });
    });

    it('ignores spoofed proxy headers from a non-Cloudflare peer (direct-to-origin)', () => {
      inProduction(() => {
        const directToOrigin = requestWithPeer(
          {
            'cf-connecting-ip': '203.0.113.10',
            'x-real-ip': '198.51.100.5',
            'x-forwarded-for': '198.51.100.6, 10.0.0.1',
          },
          '203.0.113.99',
        );
        expect(getClientIp(directToOrigin)).toBe('203.0.113.99');
      });
    });

    it('treats an IPv6 Cloudflare peer as trusted', () => {
      inProduction(() => {
        const viaCloudflareV6 = requestWithPeer(
          { 'cf-connecting-ip': '203.0.113.10' },
          // 2a06:98c0::/29 is a published Cloudflare range.
          '2a06:98c1:1::1',
        );
        expect(getClientIp(viaCloudflareV6)).toBe('203.0.113.10');
      });
    });

    it('ignores spoofed headers from a non-Cloudflare IPv6 peer', () => {
      inProduction(() => {
        const directV6 = requestWithPeer(
          { 'cf-connecting-ip': '203.0.113.10' },
          '2001:db8::1',
        );
        expect(getClientIp(directV6)).toBe('2001:db8::1');
      });
    });

    it('falls back to the peer IP when no header is present on a Cloudflare peer', () => {
      inProduction(() => {
        expect(getClientIp(requestWithPeer({}, '104.16.200.1'))).toBe(
          '104.16.200.1',
        );
      });
    });
  });
});

describe('isCloudflareIp', () => {
  it('matches inside a v4 range and rejects outside', () => {
    expect(isCloudflareIp('104.16.0.1')).toBe(true); // 104.16.0.0/13
    expect(isCloudflareIp('104.23.255.255')).toBe(true); // upper edge of /13
    expect(isCloudflareIp('104.27.255.255')).toBe(true); // upper edge of 104.24.0.0/14
    expect(isCloudflareIp('104.28.0.1')).toBe(false); // outside /13 and /14
    expect(isCloudflareIp('203.0.113.1')).toBe(false);
  });

  it('matches the /29 IPv6 range', () => {
    expect(isCloudflareIp('2a06:98c0::1')).toBe(true);
    expect(isCloudflareIp('2a06:98c7:ffff:ffff:ffff:ffff:ffff:ffff')).toBe(
      true,
    );
    expect(isCloudflareIp('2a06:98c8::1')).toBe(false);
  });

  it('rejects invalid input', () => {
    expect(isCloudflareIp(undefined)).toBe(false);
    expect(isCloudflareIp('not-an-ip')).toBe(false);
    expect(isCloudflareIp('')).toBe(false);
  });
});
