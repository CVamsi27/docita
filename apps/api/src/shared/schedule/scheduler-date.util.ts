/**
 * UTC calendar helpers for cron/scheduler arithmetic.
 * Schedulers must not use local-time `Date` setters (DST-sensitive).
 * Convert to clinic timezone only at display/notification copy.
 */

export function getPreviousUtcMonthRange(reference: Date): {
  periodStart: Date;
  periodEnd: Date;
} {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();
  return {
    periodStart: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
    periodEnd: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  };
}

/** UTC calendar day at 00:00:00.000, offset by whole days from reference's UTC date. */
export function addUtcCalendarDays(reference: Date, days: number): Date {
  return new Date(
    Date.UTC(
      reference.getUTCFullYear(),
      reference.getUTCMonth(),
      reference.getUTCDate() + days,
      0,
      0,
      0,
      0,
    ),
  );
}

export function getUtcDayBounds(date: Date): {
  startOfDay: Date;
  endOfDay: Date;
} {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  return {
    startOfDay: new Date(Date.UTC(year, month, day, 0, 0, 0, 0)),
    endOfDay: new Date(Date.UTC(year, month, day, 23, 59, 59, 999)),
  };
}
