import { describe, expect, it } from '@jest/globals';
import { BillingPeriod } from './billing-period.value-object';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

const jan = new Date('2026-01-01T00:00:00Z');
const feb = new Date('2026-02-01T00:00:00Z');
const mar = new Date('2026-03-01T00:00:00Z');

describe('BillingPeriod', () => {
  it('rejects a start date that is not before the end date', () => {
    expect(() => new BillingPeriod(feb, jan)).toThrow(InvariantViolationError);
    expect(() => new BillingPeriod(jan, jan)).toThrow(InvariantViolationError);
  });

  it('contains checks inclusive bounds', () => {
    const period = new BillingPeriod(jan, feb);
    expect(period.contains(jan)).toBe(true);
    expect(period.contains(feb)).toBe(true);
    expect(period.contains(new Date('2026-01-15T00:00:00Z'))).toBe(true);
    expect(period.contains(mar)).toBe(false);
  });

  it('getDays returns the number of days in the period', () => {
    expect(new BillingPeriod(jan, feb).getDays()).toBe(31);
  });

  it('overlappsWith detects overlap and adjacency', () => {
    const janFeb = new BillingPeriod(jan, feb);
    expect(
      janFeb.overlappsWith(
        new BillingPeriod(new Date('2026-01-15T00:00:00Z'), mar),
      ),
    ).toBe(true);
    // Adjacent (Feb–Mar starts exactly where Jan–Feb ends) → no overlap.
    expect(janFeb.overlappsWith(new BillingPeriod(feb, mar))).toBe(false);
  });

  it('equals compares both endpoints', () => {
    expect(
      new BillingPeriod(jan, feb).equals(new BillingPeriod(jan, feb)),
    ).toBe(true);
    expect(
      new BillingPeriod(jan, feb).equals(new BillingPeriod(jan, mar)),
    ).toBe(false);
  });

  it('toString renders the ISO date range', () => {
    expect(new BillingPeriod(jan, feb).toString()).toBe(
      '2026-01-01 to 2026-02-01',
    );
  });
});
