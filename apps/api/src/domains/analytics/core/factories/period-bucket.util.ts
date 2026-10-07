type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly';
type TimeSeriesGroupBy = 'day' | 'week' | 'month';

const ISO_DATE_SLICE_END = 10;
const MS_PER_DAY = 86_400_000;

/**
 * All bucket identity is derived in UTC.
 *
 * The previous implementation mixed zones inside a single key: the day/month
 * parts came from local-time getters (`getFullYear`, `getDate`, `getDay`) while
 * the date slice came from `toISOString()` (UTC). On a clinic server ahead of
 * UTC — IST is +05:30 — a local Sunday midnight serialized as the preceding
 * Saturday, so a week bucket landed a day early. Deriving every part from the
 * same UTC view makes a key a pure function of the instant, so the same event
 * always buckets the same way regardless of where the worker runs.
 *
 * The clinic's own calendar (IST) is a separate, still-open product decision:
 * these keys answer "which UTC period does this event fall in", which is what
 * the aggregates are documented to report.
 */
function toUtcMidnight(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, ISO_DATE_SLICE_END);
}

/**
 * The Monday that starts the ISO-8601 week containing `date`.
 *
 * ISO weeks start on Monday. The previous code used `getDay()` (Sunday = 0) to
 * step back to a Sunday, which is not an ISO week boundary and is what made
 * the numbering below meaningless.
 */
function getIsoWeekStart(date: Date): Date {
  const dayStart = toUtcMidnight(date);
  // Shift so Monday is 0 … Sunday is 6.
  const isoDayIndex = (dayStart.getUTCDay() + 6) % 7;
  return new Date(dayStart.getTime() - isoDayIndex * MS_PER_DAY);
}

/**
 * ISO-8601 week date, e.g. `2026-W01`.
 *
 * The previous key computed `Math.ceil((date.getDate() + weekStart.getDay()) / 7)`
 * from the day-of-month, which is not a week number at all: `2026-W1` was
 * produced for the weeks of 5 Jan, 1 Feb, 2 Feb and 1 Mar 2026, merging four
 * unrelated weeks of revenue into one bucket, and a 1 January 2026 invoice was
 * labelled `2025-W1` because the Sunday-before fell in the previous year.
 *
 * ISO numbering is defined by the Thursday of the week: it always falls in the
 * year that owns the week, which is what makes the identity unambiguous across
 * year boundaries.
 */
export function toIsoWeekKey(date: Date): string {
  const weekStart = getIsoWeekStart(date);
  // The Thursday of this ISO week determines the ISO year.
  const isoThursday = new Date(weekStart.getTime() + 3 * MS_PER_DAY);
  const isoYear = isoThursday.getUTCFullYear();

  const firstThursday = firstIsoThursdayOf(isoYear);
  const week =
    Math.round(
      (isoThursday.getTime() - firstThursday.getTime()) / MS_PER_DAY / 7,
    ) + 1;

  return `${isoYear}-W${String(week).padStart(2, '0')}`;
}

/** The Thursday that falls in week 1 of `isoYear` (between Jan 1 and Jan 7). */
function firstIsoThursdayOf(isoYear: number): Date {
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  // Jan 4 is always in ISO week 1, so its own Thursday anchors the numbering.
  const isoDayIndex = (jan4.getUTCDay() + 6) % 7;
  return new Date(jan4.getTime() - isoDayIndex * MS_PER_DAY + 3 * MS_PER_DAY);
}

/**
 * The ISO Monday's calendar date, e.g. `2026-01-05`. Used where a sortable
 * date label is wanted instead of a week number.
 */
export function toIsoWeekStartDate(date: Date): string {
  return toIsoDate(getIsoWeekStart(date));
}

export function toAnalyticsPeriodKey(
  date: Date,
  period: AnalyticsPeriod,
): string {
  if (period === 'daily') return toIsoDate(date);

  if (period === 'weekly') return toIsoWeekKey(date);

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function toTimeSeriesBucketKey(
  date: Date,
  groupBy: TimeSeriesGroupBy,
): string {
  if (groupBy === 'day') return toIsoDate(date);

  // Both week surfaces now share one identity — the same ISO week start — so a
  // period key and a time-series bucket cannot describe different weeks.
  if (groupBy === 'week') return toIsoWeekStartDate(date);

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
