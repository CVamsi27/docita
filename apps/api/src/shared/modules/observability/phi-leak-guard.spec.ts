import { describe, expect, it } from '@jest/globals';
import { buildPinoOptions } from './pino-options.factory';
import { REDACTED } from './phi-redactor';

/**
 * End-to-end safety net: exercise the same serializers and redact paths that
 * the API's pino logger uses, and assert that PHI never makes it onto the
 * wire even when a developer accidentally logs a full patient payload, an
 * error with sensitive metadata, or auth headers via a non-`req`-keyed slot.
 *
 * This is the regression guard that catches a future code change that
 * silently weakens the redactor or pino wiring. The test does not boot pino
 * itself because pino is not a direct dependency of this app; instead it
 * runs the same serializer + redact-path pipeline pino would run, which is
 * what actually moves bytes onto the log stream.
 */

type PinoOptions = ReturnType<typeof buildPinoOptions>;
type Serializers = PinoOptions['serializers'];

function applySerializers(
  payload: Record<string, unknown>,
  serializers: Serializers,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(payload)) {
    const serializer = (serializers as Record<string, (v: unknown) => unknown>)[
      key
    ];
    out[key] = serializer ? serializer(val) : val;
  }
  return out;
}

function applyRedactPaths(
  payload: Record<string, unknown>,
  paths: ReadonlyArray<string>,
  censor: string,
): Record<string, unknown> {
  const out = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  for (const path of paths) {
    redactByPath(out, path.split('.'), censor);
  }
  return out;
}

function redactByPath(obj: unknown, segments: string[], censor: string): void {
  if (!obj || typeof obj !== 'object' || segments.length === 0) return;
  const [head, ...rest] = segments;
  const cleanHead = head.replace(/\[|\]|"/g, '');
  if (cleanHead === '*') {
    if (Array.isArray(obj)) {
      for (const item of obj) redactByPath(item, rest, censor);
    } else {
      for (const key of Object.keys(obj as Record<string, unknown>)) {
        if (rest.length === 0) {
          (obj as Record<string, unknown>)[key] = censor;
        } else {
          redactByPath((obj as Record<string, unknown>)[key], rest, censor);
        }
      }
    }
    return;
  }
  if (rest.length === 0) {
    if (cleanHead in (obj as Record<string, unknown>)) {
      (obj as Record<string, unknown>)[cleanHead] = censor;
    }
    return;
  }
  redactByPath((obj as Record<string, unknown>)[cleanHead], rest, censor);
}

function logToString(payload: Record<string, unknown>): string {
  const opts = buildPinoOptions({ isProduction: true });
  const serialized = applySerializers(payload, opts.serializers);
  const redacted = applyRedactPaths(
    serialized,
    opts.redact.paths,
    opts.redact.censor,
  );
  return JSON.stringify(redacted);
}

describe('phi-leak-guard', () => {
  it('redacts PHI inside a patient payload logged via the body serializer', () => {
    const out = logToString({
      body: {
        firstName: 'Asha',
        lastName: 'Kumar',
        email: 'asha@example.com',
        phone: '9876543210',
        dob: '1990-01-01',
        clinicId: 'clinic-acme',
      },
      msg: 'patient created',
    });

    expect(out).toContain(REDACTED);
    expect(out).not.toMatch(/Asha/);
    expect(out).not.toMatch(/Kumar/);
    expect(out).not.toMatch(/asha@example\.com/);
    expect(out).not.toMatch(/9876543210/);
    expect(out).toContain('clinic-acme');
  });

  it('redacts PHI inside the patient/consultation/appointment serializer keys', () => {
    const out = logToString({
      patient: {
        id: 'p-1',
        firstName: 'Asha',
        email: 'asha@example.com',
      },
      consultation: {
        id: 'c-1',
        notes: 'patient reports chest pain',
        chiefComplaint: 'chest pain',
      },
      appointment: { id: 'a-1', notes: 'follow up in 2 weeks' },
      msg: 'consultation completed',
    });

    expect(out).toContain(REDACTED);
    expect(out).toContain('p-1');
    expect(out).toContain('c-1');
    expect(out).toContain('a-1');
    expect(out).not.toMatch(/Asha/);
    expect(out).not.toMatch(/asha@example\.com/);
    expect(out).not.toMatch(/chest pain/);
    expect(out).not.toMatch(/follow up in 2 weeks/);
  });

  it('redacts top-level credential keys via pino redact paths', () => {
    const out = logToString({
      authorization: 'Bearer eyJsupersecret',
      apiKey: 'live-key-xyz',
      token: 'topsecret-token',
      msg: 'auth seen',
    });

    expect(out).toContain(REDACTED);
    expect(out).not.toMatch(/eyJsupersecret/);
    expect(out).not.toMatch(/live-key-xyz/);
    expect(out).not.toMatch(/topsecret-token/);
  });

  it('redacts errors with PHI in message, stack, or meta via the err serializer', () => {
    const err = Object.assign(
      new Error('failed to notify asha@example.com about appointment'),
      {
        meta: { firstName: 'Asha', clinicId: 'c-1' },
        code: 'E_NOTIFY',
      },
    );

    const out = logToString({ err, msg: 'notification failed' });

    expect(out).toContain(REDACTED);
    expect(out).toContain('E_NOTIFY');
    expect(out).toContain('c-1');
    expect(out).not.toMatch(/asha@example\.com/);
    expect(out).not.toMatch(/Asha/);
  });

  it('still emits enough triage signal to debug an incident', () => {
    const out = logToString({
      requestId: 'req-1',
      clinicId: 'c-1',
      patientId: 'p-1',
      statusCode: 201,
      durationMs: 42,
      method: 'POST',
      url: '/api/v1/appointments',
      body: { firstName: 'Asha', email: 'asha@example.com' },
      msg: 'created',
    });

    expect(out).toContain('req-1');
    expect(out).toContain('c-1');
    expect(out).toContain('p-1');
    expect(out).toContain('201');
    expect(out).toContain('/api/v1/appointments');
    expect(out).toContain(REDACTED);
  });
});
