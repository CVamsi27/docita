import { randomInt } from 'node:crypto';
import {
  REFERRER_CODE_PREFIX,
  REFERRER_CODE_REGEX,
  REFERRER_CODE_SUFFIX_ALPHABET,
  REFERRER_CODE_SUFFIX_LENGTH,
  REFERRER_CODE_TOTAL_LENGTH,
} from '@workspace/types';

/**
 * Pure rules for referral partner codes. No DB, no side effects — the
 * invariants the business cares about (format, length, allowed alphabet)
 * live here so they are exhaustively unit-testable and cannot drift.
 *
 * A referral code looks like `RFR-AB12CD`:
 *   - Prefix `RFR-` distinguishes a partner code from a clinic code at a
 *     glance (clinics use the existing `Clinic.referralCode` field).
 *   - Suffix is 6 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. I, O, 0, 1
 *     are excluded to avoid ambiguous glyphs when the partner reads the
 *     code aloud on a call or pastes it into a WhatsApp message.
 */

export const REFERRER_CODE_GENERATION_ALPHABET = REFERRER_CODE_SUFFIX_ALPHABET;
export const REFERRER_CODE_GENERATION_LENGTH = REFERRER_CODE_SUFFIX_LENGTH;

/** Generate a random referrer code (`RFR-XXXXXX`). Pure, no I/O. */
export function generateReferrerCode(): string {
  let suffix = '';
  for (let i = 0; i < REFERRER_CODE_GENERATION_LENGTH; i += 1) {
    const index = randomInt(0, REFERRER_CODE_GENERATION_ALPHABET.length);
    suffix += REFERRER_CODE_GENERATION_ALPHABET[index];
  }
  return `${REFERRER_CODE_PREFIX}${suffix}`;
}

/** Format check — does the input look like a valid `RFR-XXXXXX`? Pure. */
export function isValidReferrerCode(value: unknown): value is string {
  return typeof value === 'string' && REFERRER_CODE_REGEX.test(value);
}

/** The total length of a referrer code (prefix + dash + 6 chars). */
export function referrerCodeLength(): number {
  return REFERRER_CODE_TOTAL_LENGTH;
}

/**
 * Normalize a user-entered code. Trims whitespace, uppercases, and rejects
 * anything that doesn't match the format. Returns the normalized code on
 * success, or `null` if the input is malformed. Pure.
 */
export function normalizeReferrerCodeInput(value: string): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toUpperCase();
  if (!isValidReferrerCode(trimmed)) return null;
  return trimmed;
}
