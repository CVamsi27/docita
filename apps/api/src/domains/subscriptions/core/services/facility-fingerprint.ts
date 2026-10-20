import { createHash } from 'node:crypto';
import { normalizePhoneE164 } from '@workspace/utils';

/**
 * Deterministic facility fingerprint per the referral plan: a sha256 over
 * normalized facility name + address + E.164 contact phone. The unique
 * index on this value is the race-safe duplicate guard — two concurrent
 * submits of the same facility (different idempotency keys) collide on it,
 * and the loser is routed to DUPLICATE_REVIEW instead of silently creating
 * a second row.
 *
 * Pure (no NestJS/DI) so the tests are standalone.
 */

function normalizeField(value: string): string {
  return value
    .toLowerCase()
    .replace(/[.,;:!?()'"\-\u2019\u2018]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function computeFacilityFingerprint(input: {
  facilityName: string;
  address: string;
  contactPhone: string | null | undefined;
}): string | null {
  const phone = normalizePhoneE164(input.contactPhone);
  if (!phone) return null;
  const payload = [
    normalizeField(input.facilityName),
    normalizeField(input.address),
    phone,
  ].join('|');
  return createHash('sha256').update(payload).digest('hex');
}
