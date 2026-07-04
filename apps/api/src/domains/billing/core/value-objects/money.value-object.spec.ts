import { describe, expect, it } from '@jest/globals';
import { Money } from './money.value-object';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

describe('Money', () => {
  it('rejects a negative amount', () => {
    expect(() => new Money(-1, 'INR')).toThrow(InvariantViolationError);
  });

  it('defaults the currency when omitted', () => {
    expect(new Money(100).amount).toBe(100);
  });

  describe('add', () => {
    it('adds amounts of the same currency', () => {
      expect(new Money(100, 'INR').add(new Money(50, 'INR'))).toEqual(
        new Money(150, 'INR'),
      );
    });
    it('rejects a currency mismatch', () => {
      expect(() => new Money(100, 'INR').add(new Money(1, 'USD'))).toThrow(
        /Cannot add USD to INR/,
      );
    });
  });

  describe('subtract', () => {
    it('subtracts amounts of the same currency', () => {
      expect(new Money(100, 'INR').subtract(new Money(40, 'INR'))).toEqual(
        new Money(60, 'INR'),
      );
    });
    it('rejects a currency mismatch', () => {
      expect(() => new Money(100, 'INR').subtract(new Money(1, 'USD'))).toThrow(
        /Cannot subtract USD from INR/,
      );
    });
    it('rejects a negative result', () => {
      expect(() => new Money(10, 'INR').subtract(new Money(20, 'INR'))).toThrow(
        /Result cannot be negative/,
      );
    });
  });

  describe('multiply', () => {
    it('multiplies by a non-negative factor', () => {
      expect(new Money(100, 'INR').multiply(1.5)).toEqual(
        new Money(150, 'INR'),
      );
    });
    it('rejects a negative factor', () => {
      expect(() => new Money(100, 'INR').multiply(-1)).toThrow(
        /Factor cannot be negative/,
      );
    });
  });

  it('equals compares amount and currency', () => {
    expect(new Money(100, 'INR').equals(new Money(100, 'INR'))).toBe(true);
    expect(new Money(100, 'INR').equals(new Money(100, 'USD'))).toBe(false);
    expect(new Money(100, 'INR').equals(new Money(99, 'INR'))).toBe(false);
  });

  describe('comparisons', () => {
    it('isGreaterThan / isLessThan for same currency', () => {
      expect(new Money(100, 'INR').isGreaterThan(new Money(50, 'INR'))).toBe(
        true,
      );
      expect(new Money(100, 'INR').isLessThan(new Money(150, 'INR'))).toBe(
        true,
      );
      expect(new Money(100, 'INR').isGreaterThan(new Money(150, 'INR'))).toBe(
        false,
      );
    });
    it('reject cross-currency comparisons', () => {
      expect(() =>
        new Money(100, 'INR').isGreaterThan(new Money(1, 'USD')),
      ).toThrow(/Cannot compare different currencies/);
      expect(() =>
        new Money(100, 'INR').isLessThan(new Money(1, 'USD')),
      ).toThrow(/Cannot compare different currencies/);
    });
  });
});
