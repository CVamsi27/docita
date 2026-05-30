import { createHmac, timingSafeEqual } from 'node:crypto';
import { EmailSuppressionReason } from '@workspace/db';
import { isRecord } from '@workspace/utils';

/**
 * Optional HMAC-SHA256 verification of the raw body (kept as a fallback for ESPs
 * that sign, e.g. via an `x-zoho-signature` header). ZeptoMail itself does not
 * sign — it authenticates via a configured Authorization header — so the
 * controller's primary check is a shared-secret header compare.
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

/** Constant-time string compare for the shared-secret Authorization header. */
export function secretsMatch(
  provided: string | undefined,
  secret: string,
): boolean {
  if (!provided || !secret) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export type ParsedSuppressionEvent = {
  email: string;
  reason: EmailSuppressionReason;
};

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Maps ZeptoMail event keywords (`event_name`, `event_data[].object`) to a reason. */
function reasonFromKeywords(values: string[]): EmailSuppressionReason | null {
  const joined = values.join(' ').toLowerCase();
  if (/spam|complaint|abuse/.test(joined))
    return EmailSuppressionReason.COMPLAINT;
  if (/unsub/.test(joined)) return EmailSuppressionReason.UNSUBSCRIBE;
  if (/soft.?bounce/.test(joined)) return EmailSuppressionReason.SOFT_BOUNCE;
  if (/bounce/.test(joined)) return EmailSuppressionReason.HARD_BOUNCE;
  return null;
}

/** Pulls `{ email_address: { address } }` recipient addresses from an email_info.to array. */
function toAddresses(emailInfo: unknown): string[] {
  if (!isRecord(emailInfo)) return [];
  const out: string[] = [];
  for (const entry of asArray(emailInfo.to)) {
    if (
      isRecord(entry) &&
      isRecord(entry.email_address) &&
      typeof entry.email_address.address === 'string'
    ) {
      out.push(entry.email_address.address.toLowerCase());
    }
  }
  return out;
}

/**
 * Parses a ZeptoMail delivery webhook into the precise set of recipients to act
 * on. For bounces it uses `event_data[].details[].bounced_recipient` (NOT the
 * other to/cc/from addresses in the same payload); for complaints/unsubscribes
 * with no bounced_recipient it falls back to the `email_info.to` recipients.
 */
export function parseZeptoMailEvents(
  payload: unknown,
): ParsedSuppressionEvent[] {
  if (!isRecord(payload)) return [];
  const topNames = asArray(payload.event_name).filter(
    (s): s is string => typeof s === 'string',
  );

  const out: ParsedSuppressionEvent[] = [];
  for (const message of asArray(payload.event_message)) {
    if (!isRecord(message)) continue;
    const emailInfo = message.email_info;

    for (const eventData of asArray(message.event_data)) {
      if (!isRecord(eventData)) continue;
      const objectType =
        typeof eventData.object === 'string' ? eventData.object : '';
      const reason = reasonFromKeywords([...topNames, objectType]);
      if (!reason) continue;

      const recipients = new Set<string>();
      for (const detail of asArray(eventData.details)) {
        if (isRecord(detail) && typeof detail.bounced_recipient === 'string') {
          recipients.add(detail.bounced_recipient.toLowerCase());
        }
      }
      if (
        recipients.size === 0 &&
        (reason === EmailSuppressionReason.COMPLAINT ||
          reason === EmailSuppressionReason.UNSUBSCRIBE)
      ) {
        for (const addr of toAddresses(emailInfo)) recipients.add(addr);
      }

      for (const email of recipients) out.push({ email, reason });
    }
  }
  return out;
}
