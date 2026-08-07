import { describe, expect, it } from '@jest/globals';
import { fromZonedTime } from 'date-fns-tz';
import {
  DEFAULT_TIMEZONE,
  formatClinicTodayPickerIso,
  formatUtcInstantAsClinicPickerIso,
} from '@workspace/utils';
import { dateOffset, withTime } from './seed-date-helpers';

function fromZonedNoon(timezone: string): Date {
  const todayPicker = formatClinicTodayPickerIso(timezone);
  return fromZonedTime(`${todayPicker}T12:00`, timezone);
}

describe('seed date helpers', () => {
  describe('withTime', () => {
    it('converts a clinic-local wall time into the correct UTC instant', () => {
      const base = new Date('2026-03-01T10:00:00.000Z');
      const result = withTime(base, 9, 30, 'Asia/Kolkata');
      // Asia/Kolkata is UTC+5:30, no DST: 09:30 local == 04:00 UTC.
      expect(result.toISOString()).toBe('2026-03-01T04:00:00.000Z');
    });

    it('anchors on the clinic-local calendar day of the base instant', () => {
      // 23:30 UTC on Mar 1 == 05:00 IST on Mar 2; wall time must use Mar 2.
      const base = new Date('2026-03-01T23:30:00.000Z');
      const result = withTime(base, 1, 0, 'Asia/Kolkata');
      // Mar 2 01:00 IST == Mar 1 19:30 UTC.
      expect(result.toISOString()).toBe('2026-03-01T19:30:00.000Z');
      expect(formatUtcInstantAsClinicPickerIso(result, 'Asia/Kolkata')).toBe(
        '2026-03-02',
      );
    });

    it('pads single-digit hours and minutes', () => {
      const base = new Date('2026-03-01T10:00:00.000Z');
      const result = withTime(base, 8, 5, 'Asia/Kolkata');
      expect(result.toISOString()).toBe('2026-03-01T02:35:00.000Z');
    });

    it('returns a valid instant for any calendar-valid wall time', () => {
      // The guard throws only when fromLocalISOString yields null, which
      // cannot happen for a wall time derived from a real baseDate — pin
      // that the happy path is always valid across a non-DST zone.
      const base = new Date('2026-03-01T10:00:00.000Z');
      const result = withTime(base, 9, 0, 'Pacific/Kiritimati');
      expect(Number.isNaN(result.getTime())).toBe(false);
    });

    it('resolves a DST spring-forward gap to a valid instant', () => {
      // America/New_York 2026-03-08 skips 02:00-03:00 local; date-fns-tz
      // resolves the gap forward instead of failing, so the seed never
      // crashes on DST days.
      const base = new Date('2026-03-08T06:00:00.000Z');
      const result = withTime(base, 2, 30, 'America/New_York');
      expect(result.toISOString()).toBe('2026-03-08T06:30:00.000Z');
    });
  });

  describe('dateOffset', () => {
    it('anchors at clinic-local noon and offsets by whole days', () => {
      const today = formatUtcInstantAsClinicPickerIso(
        new Date(),
        'Asia/Kolkata',
      );
      const result = dateOffset(1, 'Asia/Kolkata');
      const tomorrow = formatUtcInstantAsClinicPickerIso(
        new Date(result.getTime() - 24 * 60 * 60 * 1000),
        'Asia/Kolkata',
      );
      expect(tomorrow).toBe(today);
    });

    it('supports negative offsets for past dates', () => {
      const today = formatUtcInstantAsClinicPickerIso(
        new Date(),
        'Asia/Kolkata',
      );
      const result = dateOffset(-3, 'Asia/Kolkata');
      const threeDaysAgo = formatUtcInstantAsClinicPickerIso(
        new Date(result.getTime() + 3 * 24 * 60 * 60 * 1000),
        'Asia/Kolkata',
      );
      expect(threeDaysAgo).toBe(today);
    });

    it('resolves noon to a valid instant on any day incl. DST transitions', () => {
      // Noon local must resolve to a valid UTC instant on the actual run
      // date regardless of the zone's DST phase (EDT -04:00 vs EST -05:00).
      const result = dateOffset(0, 'America/New_York');
      const expectedNoon = fromZonedNoon('America/New_York');
      expect(result.toISOString()).toBe(expectedNoon.toISOString());
      // And it must stay on today's calendar day in the zone.
      const today = formatUtcInstantAsClinicPickerIso(
        new Date(),
        'America/New_York',
      );
      expect(
        formatUtcInstantAsClinicPickerIso(result, 'America/New_York'),
      ).toBe(today);
    });

    it('defaults to the shared DEFAULT_TIMEZONE', () => {
      const explicit = dateOffset(0, DEFAULT_TIMEZONE);
      const implicit = dateOffset(0);
      expect(implicit.toISOString()).toBe(explicit.toISOString());
    });
  });
});
