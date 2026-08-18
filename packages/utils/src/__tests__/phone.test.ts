import { describe, expect, it } from 'vitest';
import { truncatePhone } from '../phone';

describe('truncatePhone', () => {
  it('returns <unset> for undefined input', () => {
    expect(truncatePhone(undefined)).toBe('<unset>');
  });

  it('returns <unset> for empty string', () => {
    expect(truncatePhone('')).toBe('<unset>');
  });

  it('returns *** for short digit strings (fewer than 4 digits)', () => {
    expect(truncatePhone('123')).toBe('***');
    expect(truncatePhone('12')).toBe('***');
    expect(truncatePhone('1')).toBe('***');
  });

  it('returns *** for a string with no digits at all', () => {
    expect(truncatePhone('abcdefgh')).toBe('***');
  });

  it('masks all but the last 4 digits of a full phone number', () => {
    expect(truncatePhone('919876543210')).toBe('***3210');
  });

  it('strips non-digit characters before masking', () => {
    expect(truncatePhone('+91-9876-543210')).toBe('***3210');
    expect(truncatePhone('(555) 123-4567')).toBe('***4567');
  });

  it('handles a 4-digit string by showing all digits', () => {
    expect(truncatePhone('1234')).toBe('***1234');
  });
});
