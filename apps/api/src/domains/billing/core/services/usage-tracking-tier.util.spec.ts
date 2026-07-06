import { describe, expect, it } from '@jest/globals';
import {
  buildUsageWarning,
  resolveSupportedCurrency,
  resolveTierName,
} from './usage-tracking-tier.util';

describe('resolveSupportedCurrency', () => {
  it('resolves a supported currency case-insensitively', () => {
    expect(resolveSupportedCurrency('usd')).toBe('USD');
  });

  it('falls back to a supported default for an unsupported currency', () => {
    const fallback = resolveSupportedCurrency(undefined);
    expect(resolveSupportedCurrency('JPY')).toBe(fallback);
  });
});

describe('resolveTierName', () => {
  it('passes through a valid tier', () => {
    expect(resolveTierName('PROFESSIONAL')).toBe('PROFESSIONAL');
  });

  it('defaults to STARTER for missing or invalid input', () => {
    expect(resolveTierName(undefined)).toBe('STARTER');
    expect(resolveTierName('NONSENSE')).toBe('STARTER');
  });
});

describe('buildUsageWarning', () => {
  it('returns no threshold when nothing is included', () => {
    expect(buildUsageWarning(50, 0)).toEqual({
      percentUsed: 0,
      threshold: null,
    });
  });

  it('returns no threshold below 80% usage', () => {
    expect(buildUsageWarning(50, 100)).toEqual({
      percentUsed: 50,
      threshold: null,
    });
  });

  it('flags the 80% threshold from 80% up to (but not including) 100%', () => {
    expect(buildUsageWarning(80, 100)).toEqual({
      percentUsed: 80,
      threshold: 80,
    });
    expect(buildUsageWarning(99, 100).threshold).toBe(80);
  });

  it('flags the 100% threshold at and beyond full usage', () => {
    expect(buildUsageWarning(100, 100)).toEqual({
      percentUsed: 100,
      threshold: 100,
    });
    expect(buildUsageWarning(150, 100)).toEqual({
      percentUsed: 150,
      threshold: 100,
    });
  });
});
