import { createHmac, timingSafeEqual } from 'node:crypto';
import { EmailSuppressionReason } from '@workspace/db';

/**
 * Verifies an HMAC-SHA256 signature of the raw request body against the
 * configured webhook secret (timing-safe). The ESP must be configured to sign
 * the body with this secret and send it in the signature header (an optional
 * `sha256=` prefix is tolerated). Returns false on any missing/invalid input so
 * unauthenticated calls are rejected.
 */
export function verifySignature(
  rawBody: Buffer,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!secret || !signature || rawBody.length === 0) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = signature.trim().replace(/^sha256=/i, '');
  const expectedBuf = Buffer.from(expected, 'hex');
  const providedBuf = Buffer.from(provided, 'hex');
  if (expectedBuf.length === 0 || expectedBuf.length !== providedBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, providedBuf);
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

/**
 * Maps a ZeptoMail-style event payload to a single suppression reason from its
 * event keywords. Defensive on purpose — ESP webhook field names vary, so we
 * classify on keywords found anywhere in the serialized payload. Returns null
 * for events that should not suppress (e.g. opens, clicks, deliveries).
 */
export function determineSuppressionReason(
  payload: unknown,
): EmailSuppressionReason | null {
  const text = JSON.stringify(payload ?? {}).toLowerCase();
  if (/spam|complaint|abuse/.test(text))
    return EmailSuppressionReason.COMPLAINT;
  if (/unsub/.test(text)) return EmailSuppressionReason.UNSUBSCRIBE;
  if (/soft.?bounce/.test(text)) return EmailSuppressionReason.SOFT_BOUNCE;
  if (
    /bounce|invalid.?mailbox|mailbox.?(not.?found|unavailable)|user.?unknown|\b550\b/.test(
      text,
    )
  ) {
    return EmailSuppressionReason.HARD_BOUNCE;
  }
  return null;
}

/**
 * Extracts the recipient addresses from a webhook payload, excluding our own
 * sender domain (so a report that echoes the From address never suppresses us).
 */
export function extractRecipientEmails(
  payload: unknown,
  senderDomain: string,
): string[] {
  const text = JSON.stringify(payload ?? {});
  const matches = text.match(EMAIL_RE) ?? [];
  const domain = senderDomain.trim().toLowerCase();
  const unique = new Set(
    matches
      .map((m) => m.toLowerCase())
      .filter((m) => !domain || !m.endsWith(`@${domain}`)),
  );
  return [...unique];
}
