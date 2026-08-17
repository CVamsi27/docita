import { isIP } from 'node:net';

/**
 * Cloudflare's published edge IP ranges, pinned from
 * https://www.cloudflare.com/ips-v4 and /ips-v6 (fetched 2026-08-17).
 * The API origin (Fly.io) is reachable directly, so proxy headers such as
 * CF-Connecting-IP are only trustworthy when the direct socket peer is one
 * of these ranges — Cloudflare overwrites CF-Connecting-IP at the edge, but
 * a client that bypasses Cloudflare can set it (and X-Forwarded-For /
 * X-Real-IP) freely. Refresh these lists when Cloudflare publishes changes
 * (https://api.cloudflare.com/client/v4/ips).
 */
const CLOUDFLARE_IPV4_RANGES = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '141.101.64.0/18',
  '108.162.192.0/18',
  '190.93.240.0/20',
  '188.114.96.0/20',
  '197.234.240.0/22',
  '198.41.128.0/17',
  '162.158.0.0/15',
  '104.16.0.0/13',
  '104.24.0.0/14',
  '172.64.0.0/13',
  '131.0.72.0/22',
] as const;

const CLOUDFLARE_IPV6_RANGES = [
  '2400:cb00::/32',
  '2606:4700::/32',
  '2803:f800::/32',
  '2405:b500::/32',
  '2405:8100::/32',
  '2a06:98c0::/29',
  '2c0f:f248::/32',
] as const;

export function isCloudflareIp(ip: string | undefined): boolean {
  if (!ip) return false;
  const version = isIP(ip);
  if (version === 4) {
    return CLOUDFLARE_IPV4_RANGES.some((cidr) =>
      cidrContains(cidr, ip, 4),
    );
  }
  if (version === 6) {
    return CLOUDFLARE_IPV6_RANGES.some((cidr) =>
      cidrContains(cidr, ip, 6),
    );
  }
  return false;
}

function cidrContains(cidr: string, ip: string, version: 4 | 6): boolean {
  const [network, prefixRaw] = cidr.split('/');
  const prefix = Number(prefixRaw);
  if (version === 4) {
    const mask =
      prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
    return (ipv4ToInt(network) & mask) === (ipv4ToInt(ip) & mask);
  }
  const mask = ipv6PrefixMask(prefix);
  return (ipv6ToBigInt(network) & mask) === (ipv6ToBigInt(ip) & mask);
}

function ipv4ToInt(ip: string): number {
  const parts = ip.split('.');
  return (
    ((Number(parts[0]) << 24) |
      (Number(parts[1]) << 16) |
      (Number(parts[2]) << 8) |
      Number(parts[3])) >>>
    0
  );
}

function ipv6PrefixMask(prefix: number): bigint {
  if (prefix === 0) return 0n;
  if (prefix === 128) return (1n << 128n) - 1n;
  const hostBits = 128 - prefix;
  const hostMask = (1n << BigInt(hostBits)) - 1n;
  return ((1n << 128n) - 1n) ^ hostMask;
}

function ipv6ToBigInt(ip: string): bigint {
  const doubleColon = ip.indexOf('::');
  if (doubleColon !== -1) {
    const left = ip.slice(0, doubleColon).split(':').filter(Boolean);
    const right = ip.slice(doubleColon + 2).split(':').filter(Boolean);
    const missing = 8 - left.length - right.length;
    return hextetsToBigInt([...left, ...Array(missing).fill('0'), ...right]);
  }
  return hextetsToBigInt(ip.split(':'));
}

function hextetsToBigInt(groups: string[]): bigint {
  let value = 0n;
  for (const group of groups) {
    value = (value << 16n) | BigInt(parseInt(group, 16) || 0);
  }
  return value;
}
