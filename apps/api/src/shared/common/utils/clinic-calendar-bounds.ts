import { fromLocalISOString } from '@workspace/utils';

/** yyyy-mm-dd + 1 calendar day (UTC calendar arithmetic on components). */
export function addOneCalendarDayToIsoDate(dateStr: string): string {
  const parts = dateStr.split('-').map((x) => parseInt(x, 10));
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const next = new Date(Date.UTC(y, m - 1, d));
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

/**
 * Inclusive-exclusive UTC instants for a clinic-local calendar day (`yyyy-mm-dd`),
 * aligned with doctor availability slot generation.
 */
export function getClinicLocalDayUtcBounds(
  pickerDateStr: string,
  timezone: string,
): { rangeStart: Date; rangeEndExclusive: Date } | null {
  const trimmed = pickerDateStr.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  const rangeStart = fromLocalISOString(`${trimmed}T00:00`, { timezone });
  const rangeEndExclusive = fromLocalISOString(
    `${addOneCalendarDayToIsoDate(trimmed)}T00:00`,
    { timezone },
  );

  if (!rangeStart || !rangeEndExclusive) {
    return null;
  }

  return { rangeStart, rangeEndExclusive };
}
