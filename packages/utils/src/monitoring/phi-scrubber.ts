/**
 * Canonical PHI scrubber used by all client/server Sentry configs in the
 * workspace. Mirrors the patterns also used by the API observability
 * scrubber (`apps/api/src/shared/modules/observability/phi-redactor.ts`).
 *
 * Why this lives in `@workspace/utils` and not inside each app's `shared/lib`:
 *  - Sentry configs (server + client) per app multiply update sites for
 *    field/regex rules. Centralizing keeps the rule set consistent.
 *  - Pure-functional, no Sentry SDK dependency — safe to import from any
 *    runtime (Cloudflare Workers, Node, browser, jsdom tests).
 *  - The Vite apps (`apps/app`, `apps/internal`) consume the rule
 *    set through `sentry-event-scrub.ts`'s `scrubSentryEventRecord` in their
 *    `sentry.client.config.ts` `beforeSend` hooks; no per-app redactor copies
 *    remain.
 */

// check-as-cast-density: allow-file — `redactPhiDeep<T>` uses `as T` to propagate the generic identity through the recursive `walk` function which must return `unknown`; this is the canonical pattern for structure-preserving utilities.
export const REDACTED = "[REDACTED]";

const PHI_FIELDS: ReadonlySet<string> = new Set([
  "email",
  "phone",
  "phonenumber",
  "firstname",
  "lastname",
  "name",
  "fullname",
  "dob",
  "dateofbirth",
  "aadhaar",
  "aadhar",
  "pan",
  "address",
  "emergencycontactname",
  "emergencycontactphone",
  "addressline",
  "addressline1",
  "addressline2",
  "mrn",
  "medicalrecordnumber",
  "ssn",
  "nationalid",
  "password",
  "currentpassword",
  "newpassword",
  "confirmpassword",
  "passwordresettoken",
  "mfasecret",
  "mfabackupcodes",
  "token",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "authorization",
  "cookie",
  "set-cookie",
  "apikey",
  "x-api-key",
  "encryptionkey",
  "secret",
  "clientsecret",
  "signatureurl",
  "notes",
  "chiefcomplaint",
  "symptoms",
  "diagnosis",
  "preferredname",
  "insuranceprovider",
  "insurancepolicynumber",
  "insurancegroupnumber",
  "allergies",
  "abhaaddress",
]);

const SAFE_FIELDS: ReadonlySet<string> = new Set([
  "id",
  "clinicid",
  "patientid",
  "doctorid",
  "userid",
  "tenantid",
  "appointmentid",
  "consultationid",
  "createdat",
  "updatedat",
  "expiresat",
  "count",
  "total",
  "page",
  "limit",
  "status",
  "statuscode",
  "method",
  "url",
  "path",
  "route",
  "level",
  "type",
  "kind",
]);

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const PHONE_FULL_RE = /^\s*(?:\+?91[-\s]?)?\d{10}\s*$/;
const AADHAAR_RE = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;
const PAN_RE = /\b[A-Z]{5}\d{4}[A-Z]\b/g;

const MAX_DEPTH = 8;

export function redactString(input: string): string {
  if (!input) return input;
  if (PHONE_FULL_RE.test(input)) return REDACTED;
  let out = input;
  out = out.replace(EMAIL_RE, REDACTED);
  out = out.replace(AADHAAR_RE, REDACTED);
  out = out.replace(PAN_RE, REDACTED);
  return out;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function walk(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (depth > MAX_DEPTH) return REDACTED;
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value);
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) {
    return value.map((item) => walk(item, depth + 1, seen));
  }
  if (typeof value === "object") {
    if (seen.has(value)) return REDACTED;
    seen.add(value);
    if (!isRecord(value)) {
      return value;
    }
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      const lower = key.toLowerCase();
      if (SAFE_FIELDS.has(lower)) {
        out[key] = val;
      } else if (PHI_FIELDS.has(lower)) {
        out[key] = REDACTED;
      } else {
        out[key] = walk(val, depth + 1, seen);
      }
    }
    return out;
  }
  return value;
}

export function redactPhiDeep<T>(value: T): T {
  return walk(value, 0, new WeakSet()) as T;
}

export const PHI_FIELD_NAMES = PHI_FIELDS;
export const SAFE_FIELD_NAMES = SAFE_FIELDS;
