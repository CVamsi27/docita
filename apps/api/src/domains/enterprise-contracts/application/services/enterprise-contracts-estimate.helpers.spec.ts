import {
  buildEnterpriseUsageMeter,
  currentCalendarMonthPeriod,
} from './enterprise-contracts-estimate.helpers';

describe('buildEnterpriseUsageMeter', () => {
  it('calculates overage when current exceeds included', () => {
    const result = buildEnterpriseUsageMeter(150, 100, 50);
    expect(result.current).toBe(150);
    expect(result.included).toBe(100);
    expect(result.overage).toBe(50);
    expect(result.chargeCents).toBe(2500);
  });

  it('returns zero overage when current equals included', () => {
    const result = buildEnterpriseUsageMeter(100, 100, 50);
    expect(result.overage).toBe(0);
    expect(result.chargeCents).toBe(0);
  });

  it('returns zero overage when current is below included', () => {
    const result = buildEnterpriseUsageMeter(50, 100, 50);
    expect(result.overage).toBe(0);
    expect(result.chargeCents).toBe(0);
  });

  it('handles zero current usage', () => {
    const result = buildEnterpriseUsageMeter(0, 100, 50);
    expect(result.overage).toBe(0);
    expect(result.chargeCents).toBe(0);
  });

  it('handles zero included quota', () => {
    const result = buildEnterpriseUsageMeter(10, 0, 100);
    expect(result.overage).toBe(10);
    expect(result.chargeCents).toBe(1000);
  });

  it('handles zero rate', () => {
    const result = buildEnterpriseUsageMeter(200, 100, 0);
    expect(result.overage).toBe(100);
    expect(result.chargeCents).toBe(0);
  });

  it('handles large numbers', () => {
    const result = buildEnterpriseUsageMeter(100000, 50000, 25);
    expect(result.overage).toBe(50000);
    expect(result.chargeCents).toBe(1250000);
  });
});

describe('currentCalendarMonthPeriod', () => {
  it('returns first day of the month as periodStart', () => {
    const now = new Date(2026, 2, 15, 10, 30);
    const { periodStart } = currentCalendarMonthPeriod(now);
    expect(periodStart.getFullYear()).toBe(2026);
    expect(periodStart.getMonth()).toBe(2);
    expect(periodStart.getDate()).toBe(1);
    expect(periodStart.getHours()).toBe(0);
    expect(periodStart.getMinutes()).toBe(0);
  });

  it('returns last moment of the month as periodEnd', () => {
    const now = new Date(2026, 2, 15, 10, 30);
    const { periodEnd } = currentCalendarMonthPeriod(now);
    expect(periodEnd.getFullYear()).toBe(2026);
    expect(periodEnd.getMonth()).toBe(2);
    expect(periodEnd.getDate()).toBe(31);
    expect(periodEnd.getHours()).toBe(23);
    expect(periodEnd.getMinutes()).toBe(59);
    expect(periodEnd.getSeconds()).toBe(59);
  });

  it('handles January', () => {
    const now = new Date(2026, 0, 10);
    const { periodStart, periodEnd } = currentCalendarMonthPeriod(now);
    expect(periodStart.getMonth()).toBe(0);
    expect(periodStart.getDate()).toBe(1);
    expect(periodEnd.getDate()).toBe(31);
  });

  it('handles February in a leap year', () => {
    const now = new Date(2028, 1, 15);
    const { periodEnd } = currentCalendarMonthPeriod(now);
    expect(periodEnd.getMonth()).toBe(1);
    expect(periodEnd.getDate()).toBe(29);
  });

  it('handles February in a non-leap year', () => {
    const now = new Date(2026, 1, 15);
    const { periodEnd } = currentCalendarMonthPeriod(now);
    expect(periodEnd.getMonth()).toBe(1);
    expect(periodEnd.getDate()).toBe(28);
  });

  it('handles December (year boundary)', () => {
    const now = new Date(2026, 11, 25);
    const { periodStart, periodEnd } = currentCalendarMonthPeriod(now);
    expect(periodStart.getFullYear()).toBe(2026);
    expect(periodStart.getMonth()).toBe(11);
    expect(periodStart.getDate()).toBe(1);
    expect(periodEnd.getFullYear()).toBe(2026);
    expect(periodEnd.getDate()).toBe(31);
  });
});
