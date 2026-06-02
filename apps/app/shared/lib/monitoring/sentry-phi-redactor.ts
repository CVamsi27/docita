/**
 * Browser-safe PHI scrubber used by sentry.client.config and
 * sentry.server.config. Mirrors the canonical implementation at
 * apps/api/src/shared/modules/observability/phi-redactor.ts; kept in-app
 * because Sentry init runs outside the normal Next.js module graph and we
 * want zero workspace-package imports here so the config can load early.
 *
 * Event-level scrubbing lives in ./sentry-event-scrub which depends on the
 * primitives in this file (redactPhi, redactString). To avoid a circular
 * import, this module exposes only the field-level primitives; Sentry configs
 * should import scrubSentryEventRecord directly from sentry-event-scrub.
 *
 * NOTE (2026-05): the field/regex rule set is also exported from
 * `@workspace/utils` (`redactPhiDeep`, `PHI_FIELD_NAMES`, `SAFE_FIELD_NAMES`)
 * as the future canonical location. When the Sentry early-load concern is
 * verified safe, migrate this file to a thin re-export from that module.
 * SYSTEM_DESIGN_AND_PATTERNS.md §56 item 45.
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

import { redactPhiPreservingType } from "@/lib/monitoring/sentry-phi-redactor.boundary";

export function redactPhi<T>(value: T): T {
  return redactPhiPreservingType(value, (input) =>
    walk(input, 0, new WeakSet()),
  );
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
  ) {
    return value;
  }
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
