import {
  readRazorpayNoteString,
  readRazorpayClinicId,
} from './razorpay-webhook.helpers';

describe('readRazorpayNoteString', () => {
  it('returns the string value when key exists and is a string', () => {
    const notes = { clinic_id: 'clinic-123' };
    expect(readRazorpayNoteString(notes, 'clinic_id')).toBe('clinic-123');
  });

  it('returns undefined when value is not a string', () => {
    const notes = { clinic_id: 123 };
    expect(readRazorpayNoteString(notes, 'clinic_id')).toBeUndefined();
  });

  it('returns undefined when key does not exist', () => {
    const notes = { other_key: 'value' };
    expect(readRazorpayNoteString(notes, 'clinic_id')).toBeUndefined();
  });

  it('returns undefined when notes is undefined', () => {
    expect(readRazorpayNoteString(undefined, 'clinic_id')).toBeUndefined();
  });

  it('returns empty string when value is an empty string', () => {
    const notes = { clinic_id: '' };
    expect(readRazorpayNoteString(notes, 'clinic_id')).toBe('');
  });

  it('returns undefined when value is a boolean', () => {
    const notes = { flag: true };
    expect(readRazorpayNoteString(notes, 'flag')).toBeUndefined();
  });

  it('returns undefined when value is an object', () => {
    const notes = { nested: { key: 'value' } };
    expect(readRazorpayNoteString(notes, 'nested')).toBeUndefined();
  });
});

describe('readRazorpayClinicId', () => {
  it('returns clinic_id when present', () => {
    const notes = { clinic_id: 'clinic-abc' };
    expect(readRazorpayClinicId(notes)).toBe('clinic-abc');
  });

  it('returns clinicId (camelCase) when clinic_id is absent', () => {
    const notes = { clinicId: 'clinic-camel' };
    expect(readRazorpayClinicId(notes)).toBe('clinic-camel');
  });

  it('prefers clinic_id over clinicId', () => {
    const notes = { clinic_id: 'clinic-snake', clinicId: 'clinic-camel' };
    expect(readRazorpayClinicId(notes)).toBe('clinic-snake');
  });

  it('returns undefined when neither key is present', () => {
    const notes = { other: 'value' };
    expect(readRazorpayClinicId(notes)).toBeUndefined();
  });

  it('returns undefined when notes is undefined', () => {
    expect(readRazorpayClinicId(undefined)).toBeUndefined();
  });

  it('returns undefined when both keys have non-string values', () => {
    const notes = { clinic_id: 123, clinicId: 456 };
    expect(readRazorpayClinicId(notes)).toBeUndefined();
  });

  it('returns clinicId when clinic_id exists but is not a string', () => {
    const notes = { clinic_id: 123, clinicId: 'clinic-fallback' };
    expect(readRazorpayClinicId(notes)).toBe('clinic-fallback');
  });
});
