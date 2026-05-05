/**
 * Browser-safe PHI scrubber used by sentry.client.config and
 * sentry.server.config. Mirrors the canonical implementation at
 * apps/api/src/shared/modules/observability/phi-redactor.ts; kept in-app
 * because Sentry init runs outside the normal Next.js module graph and we
 * want zero workspace-package imports here so the config can load early.
 */

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
  "token",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "authorization",
  "cookie",
  "set-cookie",
  "apikey",
  "x-api-key",
  "secret",
  "clientsecret",
  "signatureurl",
  "notes",
  "chiefcomplaint",
  "symptoms",
  "diagnosis",
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

export function redactPhi<T>(value: T): T {
  return walk(value, 0, new WeakSet()) as T;
}

function walk(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (depth > MAX_DEPTH) return REDACTED;
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactString(value);
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return value;
  }
  if (value instanceof Date) return value;
  if (Array.isArray(value)) {
    return value.map((item) => walk(item, depth + 1, seen));
  }
  if (typeof value === "object") {
    if (seen.has(value as object)) return REDACTED;
    seen.add(value as object);
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
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

export function scrubSentryEvent<T>(event: T): T {
  if (!event || typeof event !== "object") return event;
  const e = event as Record<string, unknown>;

  if (e.request && typeof e.request === "object") {
    const req = e.request as Record<string, unknown>;
    if (req.data !== undefined) req.data = redactPhi(req.data);
    if (typeof req.query_string === "string") {
      req.query_string = redactString(req.query_string);
    } else if (req.query_string !== undefined) {
      req.query_string = redactPhi(req.query_string);
    }
    if (req.headers !== undefined) req.headers = redactPhi(req.headers);
    if (req.cookies !== undefined) req.cookies = redactPhi(req.cookies);
  }

  if (e.extra !== undefined) e.extra = redactPhi(e.extra);
  if (e.contexts !== undefined) e.contexts = redactPhi(e.contexts);
  if (e.tags !== undefined) e.tags = redactPhi(e.tags);

  if (Array.isArray(e.breadcrumbs)) {
    e.breadcrumbs = e.breadcrumbs.map((crumb: unknown) => {
      if (!crumb || typeof crumb !== "object") return crumb;
      const c = crumb as Record<string, unknown>;
      if (typeof c.message === "string") c.message = redactString(c.message);
      if (c.data !== undefined) c.data = redactPhi(c.data);
      return c;
    });
  }

  if (typeof e.message === "string") {
    e.message = redactString(e.message);
  }

  return e as T;
}
