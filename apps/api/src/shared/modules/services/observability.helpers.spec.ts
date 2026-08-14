import { describe, expect, it } from '@jest/globals';
import { ErrorSeverity } from '@workspace/db';
import {
  getRecordStatus,
  getRecordString,
  isRecord,
  mapLogLevelToErrorSeverity,
  toSentryContextValue,
} from './observability.helpers';

describe('toSentryContextValue', () => {
  it('returns a record for plain object values', () => {
    expect(toSentryContextValue({ a: 1, b: 'x' })).toEqual({ a: 1, b: 'x' });
  });

  it('wraps non-object values in a value field', () => {
    expect(toSentryContextValue('hello')).toEqual({ value: 'hello' });
    expect(toSentryContextValue(42)).toEqual({ value: 42 });
    expect(toSentryContextValue(null)).toEqual({ value: null });
  });

  it('wraps arrays in a value field (they are objects but not spreadable as context)', () => {
    expect(toSentryContextValue([1, 2, 3])).toEqual({ value: [1, 2, 3] });
  });
});

describe('isRecord', () => {
  it('returns true for plain objects', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ a: 1 })).toBe(true);
  });

  it('returns false for null, arrays, and primitives', () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isRecord('string')).toBe(false);
    expect(isRecord(42)).toBe(false);
  });
});

describe('getRecordStatus', () => {
  it('returns the status string when present and a string', () => {
    expect(getRecordStatus({ status: 'ok' })).toBe('ok');
    expect(getRecordStatus({ status: 'failed' })).toBe('failed');
  });

  it('returns undefined when status is missing or not a string', () => {
    expect(getRecordStatus({})).toBeUndefined();
    expect(getRecordStatus({ status: 42 })).toBeUndefined();
    expect(getRecordStatus(null)).toBeUndefined();
  });
});

describe('getRecordString', () => {
  it('returns the value when the key exists and is a string', () => {
    expect(getRecordString({ id: 'abc' }, 'id')).toBe('abc');
  });

  it('returns undefined when the key is missing or the value is not a string', () => {
    expect(getRecordString({}, 'id')).toBeUndefined();
    expect(getRecordString({ id: 42 }, 'id')).toBeUndefined();
  });

  it('returns undefined when the record is undefined', () => {
    expect(getRecordString(undefined, 'id')).toBeUndefined();
  });
});

describe('mapLogLevelToErrorSeverity', () => {
  it('maps each level to the matching ErrorSeverity enum', () => {
    expect(mapLogLevelToErrorSeverity('debug')).toBe(ErrorSeverity.DEBUG);
    expect(mapLogLevelToErrorSeverity('info')).toBe(ErrorSeverity.INFO);
    expect(mapLogLevelToErrorSeverity('warn')).toBe(ErrorSeverity.WARNING);
    expect(mapLogLevelToErrorSeverity('error')).toBe(ErrorSeverity.ERROR);
  });
});
