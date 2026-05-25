import { describe, expect, it } from '@jest/globals';
import {
  addUtcCalendarDays,
  getPreviousUtcMonthRange,
  getUtcDayBounds,
} from './scheduler-date.util';

describe('scheduler-date.util', () => {
  const reference = new Date('2026-05-19T15:30:00.000Z');

  it('getPreviousUtcMonthRange returns prior UTC month boundaries', () => {
    const { periodStart, periodEnd } = getPreviousUtcMonthRange(reference);
    expect(periodStart.toISOString()).toBe('2026-04-01T00:00:00.000Z');
    expect(periodEnd.toISOString()).toBe('2026-04-30T23:59:59.999Z');
  });

  it('addUtcCalendarDays advances by whole UTC days at midnight', () => {
    const target = addUtcCalendarDays(reference, 7);
    expect(target.toISOString()).toBe('2026-05-26T00:00:00.000Z');
  });

  it('getUtcDayBounds covers the full UTC calendar day', () => {
    const { startOfDay, endOfDay } = getUtcDayBounds(reference);
    expect(startOfDay.toISOString()).toBe('2026-05-19T00:00:00.000Z');
    expect(endOfDay.toISOString()).toBe('2026-05-19T23:59:59.999Z');
  });
});
