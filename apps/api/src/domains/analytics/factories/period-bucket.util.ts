export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly';
export type TimeSeriesGroupBy = 'day' | 'week' | 'month';

const ISO_DATE_SLICE_END = 10;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, ISO_DATE_SLICE_END);
}

function getWeekStart(date: Date): Date {
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay());
  return weekStart;
}

export function toAnalyticsPeriodKey(
  date: Date,
  period: AnalyticsPeriod,
): string {
  if (period === 'daily') {
    return toIsoDate(date);
  }

  if (period === 'weekly') {
    const weekStart = getWeekStart(date);
    return `${weekStart.getFullYear()}-W${Math.ceil((date.getDate() + weekStart.getDay()) / 7)}`;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function toTimeSeriesBucketKey(
  date: Date,
  groupBy: TimeSeriesGroupBy,
): string {
  if (groupBy === 'day') {
    return toIsoDate(date);
  }

  if (groupBy === 'week') {
    return toIsoDate(getWeekStart(date));
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
