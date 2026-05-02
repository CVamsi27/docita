import { describe, expect, it } from '@jest/globals';
import {
  PINO_REDACT_PATHS,
  REDACTED,
  redactErrSerializer,
  redactPhi,
  redactSerializer,
  redactString,
} from './phi-redactor';

describe('phi-redactor', () => {
  describe('redactString', () => {
    it('redacts a bare 10-digit Indian phone', () => {
      expect(redactString('9876543210')).toBe(REDACTED);
    });

    it('redacts +91 and 91 prefixed Indian phones', () => {
      expect(redactString('+919876543210')).toBe(REDACTED);
      expect(redactString('919876543210')).toBe(REDACTED);
      expect(redactString('+91 9876543210')).toBe(REDACTED);
      expect(redactString('+91-9876543210')).toBe(REDACTED);
    });

    it('redacts emails embedded in free text', () => {
      expect(redactString('contact us at doc@example.com please')).toBe(
        `contact us at ${REDACTED} please`,
      );
    });

    it('redacts 12-digit Aadhaar numbers including dashed/spaced forms', () => {
      expect(redactString('Aadhaar 123412341234')).toBe(`Aadhaar ${REDACTED}`);
      expect(redactString('1234-1234-1234')).toBe(REDACTED);
      expect(redactString('1234 1234 1234')).toBe(REDACTED);
    });

    it('redacts 10-character PAN identifiers', () => {
      expect(redactString('PAN: ABCDE1234F is on file')).toBe(
        `PAN: ${REDACTED} is on file`,
      );
    });

    it('leaves non-PHI strings intact', () => {
      expect(redactString('order processed successfully')).toBe(
        'order processed successfully',
      );
      expect(redactString('clinic-acme-001')).toBe('clinic-acme-001');
    });

    it('does not redact phone-shaped sub-strings inside larger digit runs', () => {
      expect(redactString('98765432101234')).toBe('98765432101234');
    });
  });

  describe('redactPhi', () => {
    it('redacts known PHI field names regardless of casing', () => {
      const out = redactPhi({
        Email: 'doc@example.com',
        FIRSTNAME: 'Asha',
        lastName: 'Kumar',
        Phone: '9876543210',
      });
      expect(out).toEqual({
        Email: REDACTED,
        FIRSTNAME: REDACTED,
        lastName: REDACTED,
        Phone: REDACTED,
      });
    });

    it('preserves allow-listed safe fields', () => {
      const out = redactPhi({
        id: 'patient-1',
        clinicId: 'clinic-1',
        createdAt: '2026-01-01T00:00:00Z',
        statusCode: 200,
      });
      expect(out).toEqual({
        id: 'patient-1',
        clinicId: 'clinic-1',
        createdAt: '2026-01-01T00:00:00Z',
        statusCode: 200,
      });
    });

    it('walks nested objects and redacts within them', () => {
      const out = redactPhi({
        clinicId: 'clinic-1',
        patient: {
          id: 'p-1',
          firstName: 'Asha',
          contact: {
            email: 'a@example.com',
            phoneNumber: '9876543210',
          },
        },
      });
      expect(out).toEqual({
        clinicId: 'clinic-1',
        patient: {
          id: 'p-1',
          firstName: REDACTED,
          contact: {
            email: REDACTED,
            phoneNumber: REDACTED,
          },
        },
      });
    });

    it('walks arrays and redacts each element', () => {
      const out = redactPhi([
        { id: 'p-1', name: 'Asha' },
        { id: 'p-2', name: 'Bala' },
      ]);
      expect(out).toEqual([
        { id: 'p-1', name: REDACTED },
        { id: 'p-2', name: REDACTED },
      ]);
    });

    it('redacts email value-pattern hits inside non-PHI-named fields', () => {
      const out = redactPhi({
        description: 'reach me at user@example.com for follow-up',
      });
      expect(out).toEqual({
        description: `reach me at ${REDACTED} for follow-up`,
      });
    });

    it('does not embed-redact phones in free text (anchored regex per spec)', () => {
      const out = redactPhi({ message: 'patient phoned from 9876543210' });
      expect(out).toEqual({
        message: 'patient phoned from 9876543210',
      });
    });

    it('redacts whole-string phone values via value-pattern', () => {
      const out = redactPhi({ contactNumber: '9876543210' });
      expect(out).toEqual({ contactNumber: REDACTED });
    });

    it('is a no-op for primitives and irrelevant data', () => {
      expect(redactPhi(42)).toBe(42);
      expect(redactPhi(true)).toBe(true);
      expect(redactPhi(null)).toBe(null);
      expect(redactPhi(undefined)).toBe(undefined);
      expect(redactPhi('hello world')).toBe('hello world');
    });

    it('does not mutate the input object', () => {
      const input = { firstName: 'Asha', clinicId: 'c-1' };
      const cloned = { ...input };
      redactPhi(input);
      expect(input).toEqual(cloned);
    });

    it('handles cyclic references without crashing', () => {
      const obj: Record<string, unknown> = { firstName: 'Asha' };
      obj.self = obj;
      const out = redactPhi(obj) as Record<string, unknown>;
      expect(out.firstName).toBe(REDACTED);
      expect(out.self).toBe(REDACTED);
    });

    it('caps recursion at the configured depth', () => {
      const depth = 20;
      let nested: Record<string, unknown> = { firstName: 'Asha' };
      for (let i = 0; i < depth; i += 1) {
        nested = { child: nested };
      }
      const out = redactPhi(nested);
      expect(out).toBeDefined();
    });
  });

  describe('serializers', () => {
    it('redactSerializer delegates to redactPhi', () => {
      const out = redactSerializer({ firstName: 'Asha', clinicId: 'c-1' });
      expect(out).toEqual({ firstName: REDACTED, clinicId: 'c-1' });
    });

    it('redactErrSerializer preserves message/stack but scrubs meta', () => {
      const err = Object.assign(new Error('failed for doc@example.com'), {
        meta: { firstName: 'Asha' },
        code: 'E_BAD',
      });
      const out = redactErrSerializer(err) as Record<string, unknown>;
      expect(out.message).toBe(`failed for ${REDACTED}`);
      expect(out.code).toBe('E_BAD');
      expect(out.meta).toEqual({ firstName: REDACTED });
      expect(typeof out.stack).toBe('string');
    });

    it('redactErrSerializer is a no-op for non-objects', () => {
      expect(redactErrSerializer(undefined)).toBe(undefined);
      expect(redactErrSerializer('not an error')).toBe('not an error');
    });
  });

  describe('PINO_REDACT_PATHS', () => {
    it('includes the canonical credential header paths', () => {
      expect(PINO_REDACT_PATHS).toEqual(
        expect.arrayContaining([
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["set-cookie"]',
          'res.headers["set-cookie"]',
        ]),
      );
    });

    it('is frozen so callers cannot mutate it', () => {
      expect(Object.isFrozen(PINO_REDACT_PATHS)).toBe(true);
    });
  });
});
