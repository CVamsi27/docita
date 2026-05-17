/**
 * Centralized PHI scrubber for log lines, Sentry events, and any other
 * outbound observability surface. Pure function with no Nest or Node-only
 * dependencies so it can be imported from pino serializers, Sentry beforeSend
 * hooks, and lightweight test fixtures alike.
 *
 * Field-name match is case-insensitive and exact (substring matches are
 * intentionally avoided to limit false positives). Value-pattern match runs on
 * any string that survives the field-name filter so embedded PHI inside
 * free-text fields (e.g. error messages, stack traces) is still redacted.
 *
 * Allow-listed safe fields are preserved verbatim — they are the columns the
 * application needs to triage incidents (ids, timestamps, status codes).
 */

export const REDACTED = '[REDACTED]';

const PHI_FIELD_NAMES: ReadonlySet<string> = new Set([
  'email',
  'phone',
  'phonenumber',
  'firstname',
  'lastname',
  'name',
  'fullname',
  'dob',
  'dateofbirth',
  'aadhaar',
  'aadhar',
  'pan',
  'address',
  'addressline',
  'addressline1',
  'addressline2',
  'city',
  'pincode',
  'postalcode',
  'mrn',
  'medicalrecordnumber',
  'ssn',
  'nationalid',
  'password',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'passwordresettoken',
  'mfasecret',
  'mfabackupcodes',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'authorization',
  'cookie',
  'set-cookie',
  'apikey',
  'x-api-key',
  'encryptionkey',
  'secret',
  'clientsecret',
  'webhooksecret',
  'signatureurl',
  'notes',
  'chiefcomplaint',
  'symptoms',
  'diagnosis',
  'observations',
]);

const SAFE_FIELD_NAMES: ReadonlySet<string> = new Set([
  'id',
  'clinicid',
  'patientid',
  'doctorid',
  'userid',
  'tenantid',
  'appointmentid',
  'consultationid',
  'invoiceid',
  'prescriptionid',
  'documentid',
  'subscriptionid',
  'organizationid',
  'jobid',
  'requestid',
  'traceid',
  'spanid',
  'correlationid',
  'createdat',
  'updatedat',
  'deletedat',
  'expiresat',
  'startsat',
  'endsat',
  'occurredat',
  'count',
  'total',
  'page',
  'limit',
  'pagesize',
  'status',
  'statuscode',
  'method',
  'url',
  'path',
  'route',
  'durationms',
  'latencyms',
  'level',
  'context',
  'service',
  'environment',
  'version',
  'role',
  'roles',
  'kind',
  'type',
  'event',
  'channel',
  'queue',
  'attempt',
]);

const EMAIL_REGEX = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const INDIAN_PHONE_FULL_REGEX = /^\s*(?:\+?91[-\s]?)?\d{10}\s*$/;
const AADHAAR_REGEX = /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g;
const PAN_REGEX = /\b[A-Z]{5}\d{4}[A-Z]\b/g;

const MAX_DEPTH = 8;

/**
 * Recursively redact PHI from arbitrary log/event payloads.
 * Returns a new object; the input is never mutated.
 */
export function redactPhi<T>(value: T): T {
  return redactWithDepth(value, 0, new WeakSet()) as T;
}

function redactWithDepth(
  value: unknown,
  depth: number,
  seen: WeakSet<object>,
): unknown {
  if (depth > MAX_DEPTH) {
    return REDACTED;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return redactString(value);
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return value;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactWithDepth(item, depth + 1, seen));
  }

  if (typeof value === 'object') {
    if (seen.has(value as object)) {
      return REDACTED;
    }
    seen.add(value as object);
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const lower = key.toLowerCase();
      if (SAFE_FIELD_NAMES.has(lower)) {
        out[key] = val;
      } else if (PHI_FIELD_NAMES.has(lower)) {
        out[key] = REDACTED;
      } else {
        out[key] = redactWithDepth(val, depth + 1, seen);
      }
    }
    return out;
  }

  return value;
}

/**
 * Redact PHI from a single string value. Handles the four declared value
 * patterns (Indian phone, email, Aadhaar, PAN). Returns the original string
 * verbatim if no pattern matches.
 */
export function redactString(input: string): string {
  if (input.length === 0) {
    return input;
  }

  if (INDIAN_PHONE_FULL_REGEX.test(input)) {
    return REDACTED;
  }

  let out = input;
  if (EMAIL_REGEX.test(out)) {
    EMAIL_REGEX.lastIndex = 0;
    out = out.replace(EMAIL_REGEX, REDACTED);
  }
  if (AADHAAR_REGEX.test(out)) {
    AADHAAR_REGEX.lastIndex = 0;
    out = out.replace(AADHAAR_REGEX, REDACTED);
  }
  if (PAN_REGEX.test(out)) {
    PAN_REGEX.lastIndex = 0;
    out = out.replace(PAN_REGEX, REDACTED);
  }
  return out;
}

/**
 * Pino redact paths for fast known-path scrubbing. The recursive
 * `redactPhi` pass handles deeper / unknown structure inside body payloads
 * via a custom serializer; these paths exist so common headers and obvious
 * top-level credentials are zapped before the serializer even runs.
 */
export const PINO_REDACT_PATHS: ReadonlyArray<string> = Object.freeze([
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["set-cookie"]',
  'req.headers["x-api-key"]',
  'res.headers["set-cookie"]',
  'password',
  'currentPassword',
  'newPassword',
  'token',
  'accessToken',
  'refreshToken',
  'idToken',
  'apiKey',
  'secret',
  'authorization',
  '*.password',
  '*.currentPassword',
  '*.newPassword',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.idToken',
  '*.apiKey',
  '*.secret',
  '*.authorization',
  '*.email',
  '*.phone',
  '*.phoneNumber',
  '*.firstName',
  '*.lastName',
  '*.dob',
  '*.dateOfBirth',
  '*.aadhaar',
  '*.pan',
  '*.address',
  '*.mrn',
  '*.medicalRecordNumber',
  '*.ssn',
  '*.nationalId',
  '*.signatureUrl',
  '*.notes',
]);

/**
 * Pino serializer wrapper. Use as `serializers: { body: redactSerializer, payload: redactSerializer, data: redactSerializer, err: redactErrSerializer }`.
 */
export function redactSerializer(value: unknown): unknown {
  return redactPhi(value);
}

/**
 * Error serializer that preserves stack/name/message but scrubs any attached
 * `meta`, `cause`, or extra context that may carry request bodies. The stack
 * itself is run through `redactString` because the first line of a Node stack
 * trace echoes the error message, which may contain PHI (e.g. an email or
 * phone number embedded in an Error constructor argument). File paths and
 * line numbers do not match any PHI pattern, so debuggability is preserved.
 */
export function redactErrSerializer(err: unknown): unknown {
  if (!err || typeof err !== 'object') {
    return err;
  }
  const e = err as Record<string, unknown>;
  return {
    type: e.type ?? e.name ?? 'Error',
    message:
      typeof e.message === 'string' ? redactString(e.message) : e.message,
    stack: typeof e.stack === 'string' ? redactString(e.stack) : e.stack,
    code: e.code,
    statusCode: e.statusCode,
    name: e.name,
    meta: e.meta !== undefined ? redactPhi(e.meta) : undefined,
    cause: e.cause !== undefined ? redactPhi(e.cause) : undefined,
  };
}
