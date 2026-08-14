import {
  lookupTierValue,
  lookupTierObject,
} from './subscription-tier-config.helpers';

describe('lookupTierValue', () => {
  const source = { STARTER: 100, ESSENTIAL: 200, PROFESSIONAL: 300 };

  it('returns the value when key exists', () => {
    expect(lookupTierValue(source, 'STARTER')).toBe(100);
  });

  it('returns undefined when key does not exist', () => {
    expect(lookupTierValue(source, 'UNKNOWN')).toBeUndefined();
  });

  it('returns undefined for empty string key', () => {
    expect(lookupTierValue(source, '')).toBeUndefined();
  });

  it('works with string values', () => {
    const tiers = { A: 'alpha', B: 'beta' };
    expect(lookupTierValue(tiers, 'A')).toBe('alpha');
  });

  it('works with boolean values', () => {
    const flags = { enabled: true, disabled: false };
    expect(lookupTierValue(flags, 'enabled')).toBe(true);
    expect(lookupTierValue(flags, 'disabled')).toBe(false);
  });

  it('returns 0 for zero value', () => {
    const vals = { ZERO: 0 };
    expect(lookupTierValue(vals, 'ZERO')).toBe(0);
  });

  it('returns null for null value', () => {
    const vals = { NONE: null as unknown };
    expect(lookupTierValue(vals, 'NONE')).toBeNull();
  });
});

describe('lookupTierObject', () => {
  const source = {
    STARTER: { doctors: 5, patients: 1000 },
    ESSENTIAL: { doctors: 15, patients: 5000 },
  };

  it('returns the object when key exists and value is an object', () => {
    const result = lookupTierObject(source, 'STARTER');
    expect(result).toEqual({ doctors: 5, patients: 1000 });
  });

  it('returns empty object when key does not exist', () => {
    expect(lookupTierObject(source, 'UNKNOWN')).toEqual({});
  });

  it('returns empty object when value is a string', () => {
    const tiers = { A: 'not-an-object' };
    expect(lookupTierObject(tiers, 'A')).toEqual({});
  });

  it('returns empty object when value is an array', () => {
    const tiers = { A: [1, 2, 3] };
    expect(lookupTierObject(tiers, 'A')).toEqual({});
  });

  it('returns empty object when value is null', () => {
    const tiers = { A: null };
    expect(lookupTierObject(tiers, 'A')).toEqual({});
  });

  it('returns empty object when value is a number', () => {
    const tiers = { A: 42 };
    expect(lookupTierObject(tiers, 'A')).toEqual({});
  });

  it('returns a copy, not the original object', () => {
    const result = lookupTierObject(source, 'STARTER');
    result.doctors = 999;
    expect((source.STARTER as Record<string, unknown>).doctors).toBe(5);
  });

  it('returns empty object for empty string key', () => {
    expect(lookupTierObject(source, '')).toEqual({});
  });
});
