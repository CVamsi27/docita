/**
 * Validate that a URL is safe to fetch from a server context.
 *
 * Server-side fetches that take user-derived URLs (clinic logo, doctor
 * signature, prescription header image) are SSRF vectors: an attacker
 * supplies http://169.254.169.254/... or http://localhost:5432/... and
 * the API obediently reaches into infrastructure it shouldn't.
 *
 * This helper:
 *   1. Requires `https:` (blocks file:, gopher:, ftp:, http://… plain).
 *   2. Refuses literal IP addresses entirely — every legitimate URL
 *      we ingest uses a DNS name (R2, configured CDN, the doctor's
 *      own clinic site). Direct-IP fetches have no business case.
 *   3. Refuses obvious localhost/metadata hostnames.
 *
 * It does NOT defeat DNS rebinding. A truly hardened path would
 * resolve the hostname and assert the returned A/AAAA is not private,
 * then `fetch` against the resolved IP with a Host header. We choose
 * not to do that here because (a) it requires a DNS lookup per fetch
 * and (b) every current call site fetches from a known origin (R2),
 * so the hostname-shape check above already raises the bar
 * significantly. Tighten later if a use case calls truly arbitrary
 * external URLs.
 */
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  'metadata.google.internal',
  'metadata',
]);

// Cloud-provider metadata service IPs and link-local space, in case
// the caller manages to slip a literal IP past the no-ip rule. These
// are belt-and-suspenders.
const BLOCKED_IP_PREFIXES = [
  '169.254.', // link-local incl. AWS/GCP/Azure metadata
  '127.', // loopback
  '0.', // self
  '10.', // RFC1918
  '192.168.', // RFC1918
  // 172.16.0.0/12 — RFC1918
  '172.16.',
  '172.17.',
  '172.18.',
  '172.19.',
  '172.20.',
  '172.21.',
  '172.22.',
  '172.23.',
  '172.24.',
  '172.25.',
  '172.26.',
  '172.27.',
  '172.28.',
  '172.29.',
  '172.30.',
  '172.31.',
];

const IPV4_LITERAL = /^(?:\d{1,3}\.){3}\d{1,3}$/;
const IPV6_LITERAL = /^\[[0-9a-f:.]+\]$/i;

export class UnsafeExternalUrlError extends Error {
  constructor(reason: string) {
    super(`Refusing to fetch external URL: ${reason}`);
    this.name = 'UnsafeExternalUrlError';
  }
}

interface AssertSafeExternalUrlOptions {
  /** Optional allowlist of `https://host` origins. */
  allowedOrigins?: readonly string[];
}

/**
 * Throws UnsafeExternalUrlError if `raw` does not pass the SSRF gate.
 * Returns a parsed URL on success.
 */
export function assertSafeExternalUrl(
  raw: string | URL,
  options: AssertSafeExternalUrlOptions = {},
): URL {
  let url: URL;
  try {
    url = typeof raw === 'string' ? new URL(raw) : raw;
  } catch {
    throw new UnsafeExternalUrlError('not a valid URL');
  }

  if (url.protocol !== 'https:') {
    throw new UnsafeExternalUrlError(`unsupported protocol '${url.protocol}'`);
  }

  const hostname = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new UnsafeExternalUrlError(`blocked hostname '${hostname}'`);
  }

  if (IPV4_LITERAL.test(hostname) || IPV6_LITERAL.test(`[${hostname}]`)) {
    // Literal IP — extra check then refuse.
    if (BLOCKED_IP_PREFIXES.some((p) => hostname.startsWith(p))) {
      throw new UnsafeExternalUrlError(`blocked IP range '${hostname}'`);
    }
    throw new UnsafeExternalUrlError(
      'literal IP addresses are not accepted; use a DNS hostname',
    );
  }

  if (options.allowedOrigins && options.allowedOrigins.length > 0) {
    if (!options.allowedOrigins.includes(url.origin)) {
      throw new UnsafeExternalUrlError(
        `origin '${url.origin}' is not on the allowlist`,
      );
    }
  }

  return url;
}
