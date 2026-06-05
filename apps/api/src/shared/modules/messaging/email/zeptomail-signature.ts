import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifySignature(
  rawBody: Buffer,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!secret || !signature || rawBody.length === 0) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return safeHexDigestCompare(
    expected,
    signature.trim().replace(/^sha256=/i, ''),
  );
}

export function secretsMatch(
  provided: string | undefined,
  secret: string,
): boolean {
  if (!provided || !secret) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

function safeHexDigestCompare(expected: string, provided: string): boolean {
  const expectedBuf = Buffer.from(expected, 'hex');
  const providedBuf = Buffer.from(provided, 'hex');
  return (
    expectedBuf.length > 0 &&
    expectedBuf.length === providedBuf.length &&
    timingSafeEqual(expectedBuf, providedBuf)
  );
}
