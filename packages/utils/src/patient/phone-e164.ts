/**
 * Single source of truth for patient phone-number handling.
 *
 * Why this exists
 * ---------------
 * Patients have always been stored with whatever phone format the operator
 * happened to type — bare 10-digit, `91…`, `+91…`, with spaces or dashes, and
 * sometimes international numbers. Every call site that needed to match a
 * phone (portal login, public-booking OTP, patient search) had to either
 * normalize the input first and then do an exact match (which silently
 * missed rows stored in a different form), or re-implement the same
 * "all equivalent representations" lookup. That drift was the root cause of
 * the portal/public-booking OTP lockout bugs.
 *
 * Rules
 * -----
 * - India-first: 10-digit input is treated as an Indian mobile and prefixed
 *   with `+91`. 12-digit `91…` input gets a `+`. Any other length with a
 *   leading `+` is kept as-is; bare digits of an unusual length get a `+`
 *   prefix so we never store something we can't recognize on the way back in.
 *   Product is India-only today — when that changes, this is the one place
 *   to extend.
 * - Normalization is idempotent: `normalizePhoneE164(x) === normalizePhoneE164(normalizePhoneE164(x))`.
 * - `phoneMatchCandidates` returns the input as given plus every equivalent
 *   form we know how to write, so a `phoneNumber: { in: [...] }` lookup
 *   finds the patient regardless of how the row was stored.
 */

const INDIA_CC = "91";

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

function stripIndiaCc(digits: string): string {
  if (digits.length === 12 && digits.startsWith(INDIA_CC)) {
    return digits.slice(INDIA_CC.length);
  }
  return digits;
}

/**
 * Normalize a free-form phone string to E.164 (`+<digits>`).
 * Returns the input unchanged if it's empty so callers can keep `null`/`""`
 * semantics without surprises.
 */
export function normalizePhoneE164(phone: string | null | undefined): string {
  if (!phone) return "";
  const trimmed = phone.trim();
  if (!trimmed) return "";
  const digits = digitsOnly(trimmed);
  if (!digits) return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
  if (digits.length === 10) return `+${INDIA_CC}${digits}`;
  if (digits.length === 12 && digits.startsWith(INDIA_CC)) {
    return `+${digits}`;
  }
  if (trimmed.startsWith("+")) return `+${digits}`;
  return `+${digits}`;
}

/**
 * Return every equivalent representation of `phone` so a `WHERE … IN (…)`
 * lookup hits the patient no matter how their number was stored: as bare
 * 10 digits, `91XXXXXXXXXX`, or `+91XXXXXXXXXX`. The input is included
 * verbatim as the first candidate so a normalized-stored row still matches.
 */
export function phoneMatchCandidates(phone: string | null | undefined): string[] {
  if (!phone) return [];
  const trimmed = phone.trim();
  if (!trimmed) return [];
  const digits = digitsOnly(trimmed);
  const bare = stripIndiaCc(digits);
  const candidates = new Set<string>([trimmed]);
  if (bare && bare.length === 10) {
    candidates.add(bare);
    candidates.add(`${INDIA_CC}${bare}`);
    candidates.add(`+${INDIA_CC}${bare}`);
  } else if (bare && bare.length === 12 && bare.startsWith(INDIA_CC)) {
    candidates.add(bare);
    candidates.add(`+${bare}`);
    candidates.add(bare.slice(INDIA_CC.length));
  }
  if (trimmed.startsWith("+")) {
    const stripped = trimmed.slice(1);
    candidates.add(stripped);
    const inner = stripIndiaCc(digitsOnly(stripped));
    if (inner && inner.length === 10) {
      candidates.add(inner);
      candidates.add(`${INDIA_CC}${inner}`);
    }
  }
  return [...candidates];
}
