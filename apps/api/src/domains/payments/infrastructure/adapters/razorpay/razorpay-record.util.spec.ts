import {
  asRazorpayRecord,
  readRazorpayStringNotes,
} from './razorpay-record.util';

describe('asRazorpayRecord', () => {
  it('returns the object when given a plain object', () => {
    const obj = { key: 'value' };
    expect(asRazorpayRecord(obj)).toBe(obj);
  });

  it('returns null for null input', () => {
    expect(asRazorpayRecord(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(asRazorpayRecord(undefined)).toBeNull();
  });

  it('returns null for string input', () => {
    expect(asRazorpayRecord('hello')).toBeNull();
  });

  it('returns null for number input', () => {
    expect(asRazorpayRecord(42)).toBeNull();
  });

  it('returns null for array input', () => {
    expect(asRazorpayRecord([1, 2, 3])).toBeNull();
  });

  it('returns empty object as a valid record', () => {
    expect(asRazorpayRecord({})).toEqual({});
  });
});

describe('readRazorpayStringNotes', () => {
  it('extracts string values from a record', () => {
    const input = { clinic_id: 'clinic-1', name: 'Test' };
    const result = readRazorpayStringNotes(input);
    expect(result).toEqual({ clinic_id: 'clinic-1', name: 'Test' });
  });

  it('filters out non-string values', () => {
    const input = { clinic_id: 'clinic-1', count: 42, flag: true };
    const result = readRazorpayStringNotes(input);
    expect(result).toEqual({ clinic_id: 'clinic-1' });
  });

  it('returns undefined for null input', () => {
    expect(readRazorpayStringNotes(null)).toBeUndefined();
  });

  it('returns undefined for undefined input', () => {
    expect(readRazorpayStringNotes(undefined)).toBeUndefined();
  });

  it('returns undefined for non-record input', () => {
    expect(readRazorpayStringNotes('string')).toBeUndefined();
  });

  it('returns undefined when no string values exist', () => {
    const input = { count: 42, flag: true, nested: {} };
    expect(readRazorpayStringNotes(input)).toBeUndefined();
  });

  it('returns undefined for empty object', () => {
    expect(readRazorpayStringNotes({})).toBeUndefined();
  });

  it('preserves all string keys', () => {
    const input = { a: '1', b: '2', c: '3' };
    const result = readRazorpayStringNotes(input);
    expect(result).toEqual({ a: '1', b: '2', c: '3' });
  });

  it('handles empty string values', () => {
    const input = { key: '' };
    const result = readRazorpayStringNotes(input);
    expect(result).toEqual({ key: '' });
  });
});
