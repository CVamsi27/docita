import { describe, expect, it } from '@jest/globals';
import {
  toAnalyticsPeriodKey,
  toIsoWeekKey,
  toIsoWeekStartDate,
  toTimeSeriesBucketKey,
} from './period-bucket.util';

/** O01 — financial week identity.
 *
 * The previous weekly key was `YYYY-W<n>` where `n` came from
 * `Math.ceil((date.getDate() + weekStart.getDay()) / 7)`. Day-of-month
 * arithmetic is not a week number, so distinct weeks collided:
 *
 *   2026-W1 -> 2026-01-05, 2026-02-01, 2026-02-02, 2026-03-01
 *   2026-W2 -> 2026-01-12, 2026-02-09
 *
 * Four unrelated weeks of revenue were summed into one bucket, and an invoice
 * dated 1 January 2026 was labelled `2025-W1` because the Sunday before it
 * falls in 2025. These fixtures pin the corrected ISO-8601 identity.
 */
describe('period-bucket util', () => {
  describe('toAnalyticsPeriodKey', () => {
    it('creates daily and monthly keys', () => {
      const date = new Date('2025-03-18T10:15:00.000Z');

      expect(toAnalyticsPeriodKey(date, 'daily')).toBe('2025-03-18');
      expect(toAnalyticsPeriodKey(date, 'monthly')).toBe('2025-03');
    });

    it('creates an ISO weekly key', () => {
      // 18 March 2025 is a Tuesday; its ISO week starts Monday 17 March and is
      // ISO week 12 of 2025.
      expect(
        toAnalyticsPeriodKey(new Date('2025-03-18T10:15:00.000Z'), 'weekly'),
      ).toBe('2025-W12');
    });

    // The acceptance criterion: January/February weeks cannot collide.
    it('never collides across a January/February boundary', () => {
      const days = [
        '2026-01-01',
        '2026-01-05',
        '2026-01-12',
        '2026-01-19',
        '2026-01-26',
        '2026-02-01',
        '2026-02-02',
        '2026-02-09',
        '2026-03-01',
      ];

      const buckets = new Map<string, string[]>();
      for (const day of days) {
        const key = toAnalyticsPeriodKey(
          new Date(`${day}T12:00:00.000Z`),
          'weekly',
        );
        buckets.set(key, [...(buckets.get(key) ?? []), day]);
      }

      // Every ISO week may contain several listed days, but a single key must
      // never span two different ISO weeks.
      const weekStarts = new Map<string, string>();
      for (const [key, keyDays] of buckets) {
        for (const day of keyDays) {
          const start = toIsoWeekStartDate(new Date(`${day}T12:00:00.000Z`));
          const existing = weekStarts.get(key);
          if (existing) expect(start).toBe(existing);
          else weekStarts.set(key, start);
        }
      }

      // The nine sampled dates fall in eight distinct ISO weeks (1 Jan and
      // 26 Jan–1 Feb share nothing; 1 Feb and 2 Feb straddle a week boundary).
      expect(new Set(weekStarts.values()).size).toBe(8);
    });

    it('separates weeks the previous day-of-month key merged', () => {
      const days = [
        '2026-01-01',
        '2026-01-05',
        '2026-01-12',
        '2026-01-19',
        '2026-01-26',
        '2026-02-01',
        '2026-02-02',
        '2026-02-09',
        '2026-03-01',
      ];

      // The removed formula, kept here as the regression witness.
      const legacyKey = (day: string): string => {
        const date = new Date(`${day}T12:00:00.000Z`);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return `${weekStart.getFullYear()}-W${Math.ceil(
          (date.getDate() + weekStart.getDay()) / 7,
        )}`;
      };

      const legacyKeys = new Set(days.map(legacyKey));
      const isoKeys = new Set(
        days.map((day) => toIsoWeekKey(new Date(`${day}T12:00:00.000Z`))),
      );

      // Eight real weeks collapse into five labels under the old formula.
      expect(legacyKeys.size).toBe(5);
      expect(isoKeys.size).toBe(8);
      // And the old labels put an invoice dated in 2026 into a 2025 week.
      expect(legacyKey('2026-01-01')).toBe('2025-W1');
    });

    it('assigns the week that straddles New Year to the ISO year that owns it', () => {
      // 31 Dec 2025 is a Wednesday. ISO week 1 of 2026 runs Mon 29 Dec 2025 –
      // Sun 4 Jan 2026, so both days carry the 2026 identity. The old key
      // produced 2025-W53-ish garbage and a 2026-W1 collision.
      expect(
        toAnalyticsPeriodKey(new Date('2025-12-29T12:00:00.000Z'), 'weekly'),
      ).toBe('2026-W01');
      expect(
        toAnalyticsPeriodKey(new Date('2025-12-31T12:00:00.000Z'), 'weekly'),
      ).toBe('2026-W01');
      expect(
        toAnalyticsPeriodKey(new Date('2026-01-01T12:00:00.000Z'), 'weekly'),
      ).toBe('2026-W01');
      expect(
        toAnalyticsPeriodKey(new Date('2026-01-05T12:00:00.000Z'), 'weekly'),
      ).toBe('2026-W02');
    });

    it('agrees with the ISO-8601 week number for known reference weeks', () => {
      // Published ISO week dates used as fixed references.
      const cases: Array<[string, string]> = [
        ['2026-01-01T00:00:00.000Z', '2026-W01'],
        ['2026-06-15T00:00:00.000Z', '2026-W25'],
        ['2026-12-28T00:00:00.000Z', '2026-W53'],
        ['2021-01-01T00:00:00.000Z', '2020-W53'],
        ['2024-12-30T00:00:00.000Z', '2025-W01'],
      ];

      for (const [instant, expected] of cases) {
        expect(toIsoWeekKey(new Date(instant))).toBe(expected);
      }
    });

    it('is stable for every instant inside one week', () => {
      const weekStart = toIsoWeekStartDate(
        new Date('2026-02-09T00:00:00.000Z'),
      );
      const keys = new Set<string>();
      // Every hour of the ISO week, and not one hour past its end.
      for (let hour = 0; hour < 7 * 24; hour += 1) {
        const at = new Date(
          Date.parse(`${weekStart}T00:00:00.000Z`) + hour * 3_600_000,
        );
        expect(toIsoWeekStartDate(at)).toBe(weekStart);
        keys.add(toIsoWeekKey(at));
      }
      expect(keys.size).toBe(1);

      // The very next hour is already a different week.
      const nextMonday = new Date(
        Date.parse(`${weekStart}T00:00:00.000Z`) + 7 * 24 * 3_600_000,
      );
      expect(toIsoWeekStartDate(nextMonday)).not.toBe(weekStart);
      expect(toIsoWeekKey(nextMonday)).not.toBe(
        toIsoWeekKey(new Date(`${weekStart}T12:00:00.000Z`)),
      );
    });

    it('buckets by UTC, not by the server timezone', () => {
      // 22:30 UTC on Sunday is already Monday in IST (+05:30). With the old
      // local-time week start the two disagreed about which week this is.
      const lateSundayUtc = new Date('2026-01-04T22:30:00.000Z');
      expect(toIsoWeekKey(lateSundayUtc)).toBe('2026-W01');
      expect(toIsoWeekStartDate(lateSundayUtc)).toBe('2025-12-29');
    });

    it('keeps the instant inside its own day across a DST transition', () => {
      // US DST began 2026-03-08. An instant after the spring-forward jump must
      // still bucket to the same calendar day it names in UTC.
      const beforeJump = new Date('2026-03-08T06:59:00.000Z');
      const afterJump = new Date('2026-03-08T07:01:00.000Z');
      expect(toAnalyticsPeriodKey(beforeJump, 'daily')).toBe('2026-03-08');
      expect(toAnalyticsPeriodKey(afterJump, 'daily')).toBe('2026-03-08');
      expect(toIsoWeekKey(beforeJump)).toBe(toIsoWeekKey(afterJump));
    });
  });

  describe('toTimeSeriesBucketKey', () => {
    it('creates day and month keys', () => {
      const date = new Date('2025-03-18T10:15:00.000Z');

      expect(toTimeSeriesBucketKey(date, 'day')).toBe('2025-03-18');
      expect(toTimeSeriesBucketKey(date, 'month')).toBe('2025-03');
    });

    // Both week surfaces must describe the same week, not two different ones.
    it('buckets by the same ISO week the period key names', () => {
      const date = new Date('2026-01-07T09:00:00.000Z');
      const periodKey = toAnalyticsPeriodKey(date, 'weekly');
      const bucketStart = toTimeSeriesBucketKey(date, 'week');

      expect(periodKey).toBe('2026-W02');
      expect(bucketStart).toBe('2026-01-05');
      expect(toIsoWeekKey(new Date(`${bucketStart}T12:00:00.000Z`))).toBe(
        periodKey,
      );
    });
  });
});
