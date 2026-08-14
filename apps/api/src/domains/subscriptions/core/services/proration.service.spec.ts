import { describe, expect, it } from '@jest/globals';
import { ProratingService } from './proration.service';
import { InvariantViolationError } from '@/shared/common/errors/domain.errors';

const service = new ProratingService();

describe('ProratingService.calculateProration', () => {
  it('rejects invalid day inputs', () => {
    expect(() => service.calculateProration(1000, 2000, -1, 30)).toThrow(
      InvariantViolationError,
    );
    expect(() => service.calculateProration(1000, 2000, 5, 0)).toThrow(
      InvariantViolationError,
    );
  });

  it('charges the prorated difference on an upgrade', () => {
    const result = service.calculateProration(99900, 249900, 15, 30);
    // credit = round(99900 * 15/30) = 49950; charge = 124950 - 49950 = 75000
    expect(result).toEqual({
      creditCents: 49950,
      chargeCents: 75000,
      daysRemaining: 15,
      totalCycleDays: 30,
    });
  });

  it('never charges below zero on a downgrade', () => {
    const result = service.calculateProration(249900, 99900, 15, 30);
    expect(result.creditCents).toBe(124950);
    expect(result.chargeCents).toBe(0);
  });
});

describe('ProratingService.getProrationDirection', () => {
  it('classifies upgrade, downgrade, and same', () => {
    expect(service.getProrationDirection(1000, 2000)).toBe('upgrade');
    expect(service.getProrationDirection(2000, 1000)).toBe('downgrade');
    expect(service.getProrationDirection(1000, 1000)).toBe('same');
  });
});

describe('ProratingService.calculateNetAmount', () => {
  it('subtracts available credits from the charge', () => {
    expect(service.calculateNetAmount(75000, 30000)).toBe(45000);
  });

  it('returns zero when credits exceed the charge', () => {
    expect(service.calculateNetAmount(75000, 100000)).toBe(0);
  });
});

describe('ProratingService.createProratedPreview', () => {
  it('assembles direction, credit, charge, and net amount', () => {
    const preview = service.createProratedPreview(99900, 249900, 15, 30, 50000);
    expect(preview).toEqual({
      direction: 'upgrade',
      credit: 49950,
      charge: 75000,
      netAmount: 25000,
    });
  });

  it('defaults available credits to zero', () => {
    const preview = service.createProratedPreview(99900, 249900, 15, 30);
    expect(preview.netAmount).toBe(75000);
  });
});
