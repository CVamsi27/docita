import { describe, expect, it } from '@jest/globals';
import { parseDurationDays } from './medication-duration.rules';

describe('medication-duration.rules', () => {
  it('parses day durations', () => {
    expect(parseDurationDays('10 days')).toBe(10);
  });

  it('converts weeks to days', () => {
    expect(parseDurationDays('2 weeks')).toBe(14);
  });

  it('converts months to days', () => {
    expect(parseDurationDays('1 month')).toBe(30);
  });

  it('is case-insensitive', () => {
    expect(parseDurationDays('3 WEEKS')).toBe(21);
  });

  it('returns null for unrecognized durations', () => {
    expect(parseDurationDays('ongoing')).toBeNull();
  });
});
