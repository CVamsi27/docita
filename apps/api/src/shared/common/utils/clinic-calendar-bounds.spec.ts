import { describe, expect, it } from '@jest/globals';
import {
  addOneCalendarDayToIsoDate,
  getClinicLocalDayUtcBounds,
} from './clinic-calendar-bounds';

describe('clinic-calendar-bounds', () => {
  it('addOneCalendarDayToIsoDate rolls calendar days in UTC', () => {
    expect(addOneCalendarDayToIsoDate('2026-05-07')).toBe('2026-05-08');
    expect(addOneCalendarDayToIsoDate('2026-05-31')).toBe('2026-06-01');
  });

  it('getClinicLocalDayUtcBounds matches Asia/Kolkata local midnight window', () => {
    const bounds = getClinicLocalDayUtcBounds('2026-05-07', 'Asia/Kolkata');
    expect(bounds).not.toBeNull();
    expect(bounds!.rangeStart.toISOString()).toBe('2026-05-06T18:30:00.000Z');
    expect(bounds!.rangeEndExclusive.toISOString()).toBe(
      '2026-05-07T18:30:00.000Z',
    );
  });

  it('getClinicLocalDayUtcBounds returns null for invalid IANA timezone', () => {
    expect(getClinicLocalDayUtcBounds('2026-05-28', 'Invalid/Zone')).toBeNull();
  });
});
