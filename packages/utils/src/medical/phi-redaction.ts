/**
 * Best-effort redaction of direct patient identifiers from free text before it
 * is sent to an external AI provider (DPDP data-minimisation / cross-border
 * exposure control).
 *
 * What it reliably removes: emails, Indian phone numbers, Aadhaar (12-digit),
 * ABHA numbers (14-digit) and ABHA addresses, and long numeric IDs (MRN-like).
 * What it CANNOT reliably remove from free text: person *names* (no NER here).
 * So this is a defence-in-depth layer, not a guarantee of de-identification —
 * the primary control is not sending raw patient documents to the cloud at all
 * (`AI_CLOUD_OCR_ENABLED=false`). Document AI processing in the consent notice.
 */

const REDACTIONS: Array<{ re: RegExp; token: string }> = [
  // emails
  { re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, token: '[EMAIL]' },
  // ABHA address (name@abdm / @sbx etc.) — before generic email already caught
  // most, but ABHA suffixes can be 2+ letters with no TLD dot.
  { re: /\b[a-z][a-z0-9._]{2,}@(?:abdm|sbx|pqr)\b/gi, token: '[ABHA_ADDRESS]' },
  // ABHA number: 14 digits, optionally hyphenated as 2-4-4-4
  { re: /\b\d{2}-?\d{4}-?\d{4}-?\d{4}\b/g, token: '[ABHA]' },
  // Aadhaar: 12 digits, optionally spaced/hyphenated as 4-4-4
  { re: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, token: '[AADHAAR]' },
  // Indian mobile: optional +91/0 prefix then 10 digits starting 6-9
  {
    re: /(?:\+?91[\s-]?|0)?[6-9]\d{9}\b/g,
    token: '[PHONE]',
  },
  // Long numeric IDs (MRN / registration), 6+ consecutive digits not already
  // handled above — clinical values (dosages, vitals) are rarely 6+ digits.
  { re: /\b\d{6,}\b/g, token: '[ID]' },
];

export function redactPatientIdentifiers(text: string): string {
  if (!text) return text;
  let out = text;
  for (const { re, token } of REDACTIONS) {
    out = out.replace(re, token);
  }
  return out;
}

/** True when any direct identifier pattern is present (for logging/metrics). */
export function containsPatientIdentifier(text: string): boolean {
  return redactPatientIdentifiers(text) !== text;
}
