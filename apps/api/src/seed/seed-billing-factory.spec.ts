import { describe, expect, it } from '@jest/globals';
import {
  buildSeedUsageKeys,
  getMonthRange,
  getSeedBillingPeriods,
  type SeedBillingPeriods,
} from './seed-billing-factory';

/**
 * Deterministic periods for the key-shape tests. The local-vs-UTC month
 * relationship in `getSeedBillingPeriods()` depends on the runner's timezone
 * (UTC runners collapse the six keys to three), so these tests construct
 * periods explicitly instead of asserting on the ambient clock.
 */
function periodsWithCycleKeys(legacyUtcCycleKey: string): SeedBillingPeriods {
  return {
    cycleStart: new Date('2026-04-01T00:00:00.000Z'),
    cycleEnd: new Date('2026-04-30T23:59:59.999Z'),
    cycleKey: '2026-04',
    legacyUtcCycleKey,
    subscriptionStart: new Date('2026-04-01T00:00:00.000Z'),
    subscriptionEnd: new Date('2027-04-01T00:00:00.000Z'),
  };
}

describe('seed billing factory', () => {
  it('getMonthRange returns the first instant and last instant of the month', () => {
    const { start, end } = getMonthRange(new Date(2026, 3, 15)); // April 2026
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(3);
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(3);
    expect(end.getDate()).toBe(30);
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
  });

  it('getSeedBillingPeriods yields a YYYY-MM cycle key and a one-year subscription', () => {
    const periods = getSeedBillingPeriods();
    expect(periods.cycleKey).toMatch(/^\d{4}-\d{2}$/);
    expect(periods.legacyUtcCycleKey).toMatch(/^\d{4}-\d{2}$/);
    expect(periods.cycleStart.getTime()).toBeLessThan(
      periods.cycleEnd.getTime(),
    );
    expect(periods.subscriptionStart.getTime()).toBeLessThan(
      periods.subscriptionEnd.getTime(),
    );
    const subscriptionMonths =
      (periods.subscriptionEnd.getFullYear() -
        periods.subscriptionStart.getFullYear()) *
        12 +
      (periods.subscriptionEnd.getMonth() -
        periods.subscriptionStart.getMonth());
    expect(subscriptionMonths).toBe(12);
  });

  it('buildSeedUsageKeys emits the six seed:<clinic>:<cycle>:<metric> keys', () => {
    // Distinct cycle keys (as on a positive-offset timezone runner): the
    // legacy-UTC and current keys name different months, so all six values
    // are distinct strings.
    const periods = periodsWithCycleKeys('2026-03');
    const keys = buildSeedUsageKeys('clinic-1', periods);
    expect(keys.consultations).toBe(
      `seed:clinic-1:${periods.cycleKey}:consultations`,
    );
    expect(keys.whatsapp).toBe(`seed:clinic-1:${periods.cycleKey}:whatsapp`);
    expect(keys.users).toBe(`seed:clinic-1:${periods.cycleKey}:users`);
    expect(keys.legacyConsultations).toBe(
      `seed:clinic-1:${periods.legacyUtcCycleKey}:consultations`,
    );
    expect(keys.legacyWhatsapp).toBe(
      `seed:clinic-1:${periods.legacyUtcCycleKey}:whatsapp`,
    );
    expect(keys.legacyUsers).toBe(
      `seed:clinic-1:${periods.legacyUtcCycleKey}:users`,
    );
    expect(new Set(Object.values(keys)).size).toBe(6);
  });

  it('buildSeedUsageKeys collapses to 3 distinct keys when cycle keys match', () => {
    // When local and UTC months coincide (UTC runner), legacy and current
    // keys are the same string — the delete path dedupes them
    // (Array.from(new Set(...))), so only 3 distinct values remain.
    const periods = periodsWithCycleKeys('2026-04');
    const keys = buildSeedUsageKeys('clinic-1', periods);
    const distinct = new Set(Object.values(keys)).size;
    expect(distinct).toBe(3);
  });
});
